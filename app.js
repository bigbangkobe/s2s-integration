const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const bizSdk = require('facebook-nodejs-business-sdk');
const crypto = require('crypto');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');  // 导入 path 模块

require('dotenv').config();  // 加载环境变量

const app = express();
const port = 5000;

// 使用 body-parser 解析 JSON 格式的请求体
app.use(bodyParser.json());
app.use(cors());

// Facebook API 配置
const FB_API_URL = `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PIXEL_ID}/events`;
// 加载 SSL 证书和私钥
const options = {
    key: fs.readFileSync('/home/s2s-integration/16929102_naturich.top_other/naturich.top.key'), // 私钥文件路径
    cert: fs.readFileSync('/home/s2s-integration/16929102_naturich.top_other/naturich.top.pem'), // 证书文件路径
    //ca: fs.readFileSync('/home/s2s-integration/16929102_naturich.top_other/ca_bundle.crt') // 如果有 CA Bundle，指定路径
};

// 提供静态文件
app.use(express.static(path.join(__dirname, 'loading_page')));
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 捕获未处理的异常
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


// 接收参数并调用 Jenkins 接口
let userConnections = {};  // 存储用户 WebSocket 连接的映射
let sessionIdCounter = 1;  // 用于生成递增的会话 ID

// 定义一个生成会话 ID 的接口
app.get('/generate-session-id', (req, res) => {
    const sessionId = sessionIdCounter++;  // 获取当前的会话 ID 并自增
    res.json({ sessionId });
});

// 创建 HTTPS 服务器
const server = https.createServer(options, app);
// 启动 WebSocket 服务器并绑定到 HTTPS 服务器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    const sessionId = new URLSearchParams(req.url.split('?')[1]).get('sessionId');  // 假设用户 ID 会作为查询参数传递

    console.log(`User connected: ${sessionId}`);
    
    // 保存用户连接
    userConnections[sessionId] = ws;

    ws.on('close', () => {
        console.log(`User disconnected: ${sessionId}`);
        // 移除用户连接
        delete userConnections[sessionId];
    });
});

// 触发 Jenkins 构建接口
app.get('/trigger-build', async (req, res) => {
    const { url, fbc, sessionId } = req.query;

    if (!url || !fbc || !sessionId) {
        return res.status(400).json({ status: 'failure', message: 'URL, FBC, and sessionId are required.' });
    }

    let queueItemId = 0;  // 用来存储队列项 ID

    try {
        // 触发 Jenkins 构建请求并获取队列项 ID
        const response = await axios.post(
            'http://naturich.top:8080/job/NaturichProst/buildWithParameters',
            null,
            {
                params: {
                    URL: url,
                    FBC: fbc
                },
                auth: {
                    username: 'cpGo',
                    password: '11967113e707e73e25d451037e620af67e'  // 用你的 API token 替代
                }
            }
        );

        // 从响应头获取队列项 ID
        const locationHeader = response.headers['location'];
        console.log("locationHeader" + locationHeader);  // 打印 location 头部值
        if (locationHeader) {
            // 使用 split 分割 URL，获取倒数第二个元素作为队列项 ID
            const queueId = locationHeader.split('/').slice(-2, -1)[0];
            queueItemId = queueId;
            console.log('Queue Item ID:', queueItemId);
        } else {
            res.status(500).json({
                status: 'failure',
                message: 'Unable to retrieve queue item location URL.'
            });
            return;
        }

    } catch (error) {
        console.error('Error triggering Jenkins build:', error);
        res.status(500).json({
            status: 'failure',
            message: 'Error triggering Jenkins build.',
            error: error.message
        });
        return;
    }

    async function checkQueueStatus() {
        try {
            // 查询队列项的状态
            const queueItemResponse = await axios.get(
                `http://naturich.top:8080/queue/item/${queueItemId}/api/json`,
                {
                    auth: {
                        username: 'cpGo',
                        password: '11967113e707e73e25d451037e620af67e'  // 用你的 API token 替代
                    }
                }
            );

            const queueItem = queueItemResponse.data;

            // 如果队列项有可执行项（executable），说明构建已经开始
            if (queueItem.executable) {
                const buildNumber = queueItem.executable.number;  // 获取构建号
                console.log(`Build started with build number: ${buildNumber}`);
                checkBuildStatus(buildNumber);  // 开始轮询构建状态
            } else {
                // 如果构建还没有开始，继续查询队列项状态
                console.log('Build is still in the queue...');
                setTimeout(checkQueueStatus, 1000);  // 每 1 秒查询一次队列项状态
            }

        } catch (error) {
            console.error('Error fetching queue status:', error);
            if (userConnections[sessionId]) {
                userConnections[sessionId].send(JSON.stringify({
                    status: 'failure',
                    message: 'Error querying Jenkins queue status.',
                    error: error.message
                }));
            }
        }
    }

    // 获取构建状态
    async function checkBuildStatus(buildNumber) {
        try {
            const buildStatusResponse = await axios.get(
                `http://naturich.top:8080/job/NaturichProst/${buildNumber}/api/json`,
                {
                    auth: {
                        username: 'cpGo',
                        password: '11967113e707e73e25d451037e620af67e'  // 用你的 API token 替代
                    }
                }
            );

            const buildStatus = buildStatusResponse.data;

            const progress = {
                building: buildStatus.building,
                stage: buildStatus.actions?.[0]?.parameters?.[0]?.value || "Unknown",
                progressPercentage: buildStatus.progress || 0,
                url: buildStatus.url,
                status: buildStatus.result || "In Progress"
            };

            // 如果连接的 WebSocket 存在，发送进度给特定用户
            if (userConnections[sessionId] && userConnections[sessionId].readyState === WebSocket.OPEN) {
                console.log('准备发送进度:', progress);  // 输出即将发送的数据
                try {
                    userConnections[sessionId].send(JSON.stringify(progress));  // 发送进度
                    console.log('进度已发送:', progress);  // 输出已发送的数据
                } catch (error) {
                    console.error('发送进度时发生错误:', error);  // 如果发送时发生错误，输出错误信息
                }
            } else {
                console.log(`WebSocket 连接不存在或未准备好，sessionId: ${sessionId}`);
            }


            if (buildStatus.building) {
                setTimeout(() => checkBuildStatus(buildNumber), 1000);  // 每 1 秒查询一次
            } else {
                console.log(`Build completed with status: ${buildStatus.result}`);
                const downloadUrl = buildStatus.description;
                userConnections[sessionId]?.send(JSON.stringify({
                    status: 'success',
                    message: 'Build completed',
                    build: {
                        buildNumber: buildNumber,
                        progress: progress.status,
                        downloadUrl: downloadUrl,
                        buildUrl: buildStatus.url
                    }
                }));
            }

        } catch (error) {
            console.error('Error fetching build status:', error);
            if (userConnections[sessionId]) {
                userConnections[sessionId].send(JSON.stringify({
                    status: 'failure',
                    message: 'Error querying Jenkins build status.',
                    error: error.message
                }));
            }
        }
    }

    // 初始化查询队列状态
    checkQueueStatus();
});




const { exec } = require('child_process');

// 发送事件到 Facebook 的函数
const sendEventToFacebook = async (eventData) => {
    try {
        // 发送请求
        const response = await axios.post(FB_API_URL, {
            data: [eventData],
            access_token: ACCESS_TOKEN,
        });

        // 打印响应的原始内容
        console.log("Facebook API Response:", response.data);

        return response.data;  // 假设返回的结果是 JSON 格式
    } catch (error) {
        console.error('Error sending event to Facebook:', error.response ? error.response.data : error.message);
        throw error;  // 如果发生错误，抛出错误
    }
};

// ------------------------- 标准事件 -------------------------


// 购买事件
// 购买事件
app.post('/purchase', async (req, res) => {
    try {
        'use strict';
        const Content = bizSdk.Content;
        const CustomData = bizSdk.CustomData;
        const DeliveryCategory = bizSdk.DeliveryCategory;
        const EventRequest = bizSdk.EventRequest;
        const UserData = bizSdk.UserData;
        const ServerEvent = bizSdk.ServerEvent;

        const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
        const pixel_id = process.env.FACEBOOK_PIXEL_ID;
        const api = bizSdk.FacebookAdsApi.init(access_token);

        let current_timestamp = Math.floor(new Date() / 1000);

        // 从请求参数中获取数据
        const { email, phone, ip, userAgent, fbp, fbc, productId, quantity, currency, value, productUrl } = req.body;

        // 检查必填参数是否存在
        if (!email || !phone || !ip || !userAgent || !fbp || !fbc || !productId || !quantity || !currency || !value || !productUrl) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // 获取用户数据
        const userData = new UserData()
            .setEmails([hashData(email)]) // 从请求参数获取邮件
            .setPhones(phone.map(num => hashData(num))) // 从请求参数获取电话号码
            .setClientIpAddress(ip)  // 从请求参数获取客户端IP地址
            .setClientUserAgent(userAgent) // 从请求参数获取客户端User-Agent
            .setFbp(fbp)  // 从请求参数获取 FBP
            .setFbc(fbc);  // 从请求参数获取 FBC

        // 商品数据
        const content = new Content()
            .setId(productId) // 从请求参数获取商品ID
            .setQuantity(quantity) // 从请求参数获取商品数量
            .setDeliveryCategory(DeliveryCategory.HOME_DELIVERY);

        const customData = new CustomData()
            .setContents([content])
            .setCurrency(currency) // 从请求参数获取货币类型
            .setValue(value); // 从请求参数获取商品价值

        // 创建事件
        const serverEvent = new ServerEvent()
            .setEventName('Purchase')
            .setEventTime(current_timestamp)
            .setUserData(userData)
            .setCustomData(customData)
            .setEventSourceUrl(productUrl) // 从请求参数获取产品URL
            .setActionSource('website');

        const eventsData = [serverEvent];
        const eventRequest = new EventRequest(access_token, pixel_id).setEvents(eventsData);

        // 执行事件请求
        const response = await eventRequest.execute();
        console.log('Facebook API Response:', response);

        res.json({ status: 'Event sent to Facebook', response });

    } catch (err) {
        console.error('Error sending purchase event:', err);

        // 检查错误是否来自 Facebook API
        if (err.response && err.response.data) {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.response.data
            });
        } else {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.message || 'Unknown error occurred'
            });
        }
    }
});


// 查看内容事件
app.post('/viewcontent', async (req, res) => {
    try {
        const { email, phone, ip, userAgent, fbp, fbc, productId, productUrl } = req.body;

        // 参数校验，确保所有必需的字段存在
        if (!email || !phone || !ip || !userAgent || !fbp || !fbc || !productId || !productUrl) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const currentTimestamp = Math.floor(new Date() / 1000);

        // 构建用户数据对象
        const userData = new bizSdk.UserData()
            .setEmails([hashData(email)])
            .setPhones(phone.map(num => hashData(num)))
            .setClientIpAddress(ip)
            .setClientUserAgent(userAgent)
            .setFbp(fbp)
            .setFbc(fbc);

        // 构建内容数据对象
        const content = new bizSdk.Content()
            .setId(productId);

        // 构建自定义数据对象
        const customData = new bizSdk.CustomData()
            .setContents([content]);

        // 创建 Facebook 事件
        const serverEvent = new bizSdk.ServerEvent()
            .setEventName('ViewContent')
            .setEventTime(currentTimestamp)
            .setUserData(userData)
            .setCustomData(customData)
            .setEventSourceUrl(productUrl)
            .setActionSource('website');

        // 构建事件请求
        const eventsData = [serverEvent];
        const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
            .setEvents(eventsData);

        // 发送事件到 Facebook
        const response = await eventRequest.execute();
        console.log('Facebook API Response:', response);

        res.json({ status: 'Event sent to Facebook', response });

    } catch (err) {
        console.error('Error sending ViewContent event:', err);

        // 检查错误是否来自 Facebook API
        if (err.response && err.response.data) {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.response.data
            });
        } else {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.message || 'Unknown error occurred'
            });
        }
    }
});


//添加到购物车事件
app.post('/addtocart', async (req, res) => {
    try {
        const { email, phone, ip, userAgent, fbp, fbc, productId, quantity, productUrl } = req.body;

        // 参数校验，确保所有必需的字段存在
        if (!email || !phone || !ip || !userAgent || !fbp || !fbc || !productId || !quantity || !productUrl) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const currentTimestamp = Math.floor(new Date() / 1000);

        // 构建用户数据对象
        const userData = new bizSdk.UserData()
            .setEmails([hashData(email)])
            .setPhones(phone.map(num => hashData(num)))
            .setClientIpAddress(ip)
            .setClientUserAgent(userAgent)
            .setFbp(fbp)
            .setFbc(fbc);

        // 构建内容数据对象
        const content = new bizSdk.Content()
            .setId(productId)
            .setQuantity(quantity);

        // 构建自定义数据对象
        const customData = new bizSdk.CustomData()
            .setContents([content]);

        // 创建 Facebook 事件
        const serverEvent = new bizSdk.ServerEvent()
            .setEventName('AddToCart')
            .setEventTime(currentTimestamp)
            .setUserData(userData)
            .setCustomData(customData)
            .setEventSourceUrl(productUrl)
            .setActionSource('website');

        // 构建事件请求
        const eventsData = [serverEvent];
        const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
            .setEvents(eventsData);

        // 发送事件到 Facebook
        const response = await eventRequest.execute();
        console.log('Facebook API Response:', response);

        res.json({ status: 'Event sent to Facebook', response });

    } catch (err) {
        console.error('Error sending AddToCart event:', err);

        // 检查错误是否来自 Facebook API 并提供详细错误信息
        if (err.response && err.response.data) {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.response.data
            });
        } else {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.message || 'Unknown error occurred'
            });
        }
    }
});


//添加到愿望清单事件
app.post('/addtowishlist', async (req, res) => {
    try {
        const { email, phone, ip, userAgent, fbp, fbc, productId, productUrl } = req.body;

        // 参数校验，确保所有必需的字段存在
        if (!email || !phone || !ip || !userAgent || !fbp || !fbc || !productId || !productUrl) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const currentTimestamp = Math.floor(new Date() / 1000);

        // 构建用户数据对象
        const userData = new bizSdk.UserData()
            .setEmails([hashData(email)])
            .setPhones(phone.map(num => hashData(num)))
            .setClientIpAddress(ip)
            .setClientUserAgent(userAgent)
            .setFbp(fbp)
            .setFbc(fbc);

        // 构建内容数据对象
        const content = new bizSdk.Content()
            .setId(productId);

        // 构建自定义数据对象
        const customData = new bizSdk.CustomData()
            .setContents([content]);

        // 创建 Facebook 事件
        const serverEvent = new bizSdk.ServerEvent()
            .setEventName('AddToWishlist')
            .setEventTime(currentTimestamp)
            .setUserData(userData)
            .setCustomData(customData)
            .setEventSourceUrl(productUrl)
            .setActionSource('website');

        // 构建事件请求
        const eventsData = [serverEvent];
        const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
            .setEvents(eventsData);

        // 发送事件到 Facebook
        const response = await eventRequest.execute();
        console.log('Facebook API Response:', response);

        res.json({ status: 'Event sent to Facebook', response });

    } catch (err) {
        console.error('Error sending AddToWishlist event:', err);

        // 检查错误是否来自 Facebook API 并提供详细错误信息
        if (err.response && err.response.data) {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.response.data
            });
        } else {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.message || 'Unknown error occurred'
            });
        }
    }
});


//开始结账事件
app.post('/initiatecheckout', async (req, res) => {
    try {
        const { email, phone, ip, userAgent, fbp, fbc, productId, quantity, value, currency, productUrl } = req.body;

        // 参数校验，确保所有必需的字段存在
        if (!email || !phone || !ip || !userAgent || !fbp || !fbc || !productId || !quantity || !value || !currency || !productUrl) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const currentTimestamp = Math.floor(new Date() / 1000);

        // 构建用户数据对象
        const userData = new bizSdk.UserData()
            .setEmails([hashData(email)])
            .setPhones(phone.map(num => hashData(num)))
            .setClientIpAddress(ip)
            .setClientUserAgent(userAgent)
            .setFbp(fbp)
            .setFbc(fbc);

        // 构建内容数据对象
        const content = new bizSdk.Content()
            .setId(productId)
            .setQuantity(quantity);

        // 构建自定义数据对象
        const customData = new bizSdk.CustomData()
            .setContents([content])
            .setValue(value)
            .setCurrency(currency);

        // 创建 Facebook 事件
        const serverEvent = new bizSdk.ServerEvent()
            .setEventName('InitiateCheckout')
            .setEventTime(currentTimestamp)
            .setUserData(userData)
            .setCustomData(customData)
            .setEventSourceUrl(productUrl)
            .setActionSource('website');

        // 构建事件请求
        const eventsData = [serverEvent];
        const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
            .setEvents(eventsData);

        // 发送事件到 Facebook
        const response = await eventRequest.execute();
        console.log('Facebook API Response:', response);

        res.json({ status: 'Event sent to Facebook', response });

    } catch (err) {
        console.error('Error sending InitiateCheckout event:', err);

        // 检查错误是否来自 Facebook API 并提供详细错误信息
        if (err.response && err.response.data) {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.response.data
            });
        } else {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.message || 'Unknown error occurred'
            });
        }
    }
});


//潜在客户事件
app.post('/lead', async (req, res) => {
    try {
        const { email, phone, ip, userAgent, fbp, fbc, leadUrl } = req.body;

        // 参数校验，确保所有必需的字段存在
        if (!email || !phone || !ip || !userAgent || !fbp || !fbc || !leadUrl) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const currentTimestamp = Math.floor(new Date() / 1000);

        // 构建用户数据对象
        const userData = new bizSdk.UserData()
            .setEmails([hashData(email)])
            .setPhones(phone.map(num => hashData(num)))
            .setClientIpAddress(ip)
            .setClientUserAgent(userAgent)
            .setFbp(fbp)
            .setFbc(fbc);

        // 创建 Facebook 事件
        const serverEvent = new bizSdk.ServerEvent()
            .setEventName('Lead')
            .setEventTime(currentTimestamp)
            .setUserData(userData)
            .setEventSourceUrl(leadUrl)
            .setActionSource('website');

        // 构建事件请求
        const eventsData = [serverEvent];
        const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
            .setEvents(eventsData);

        // 发送事件到 Facebook
        const response = await eventRequest.execute();
        console.log('Facebook API Response:', response);

        res.json({ status: 'Event sent to Facebook', response });

    } catch (err) {
        console.error('Error sending Lead event:', err);

        // 检查错误是否来自 Facebook API 并提供详细错误信息
        if (err.response && err.response.data) {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.response.data
            });
        } else {
            res.status(500).json({
                error: 'Failed to send event to Facebook',
                details: err.message || 'Unknown error occurred'
            });
        }
    }
});


//自定义事件
app.post('/customevent', async (req, res) => {
    try {
        const { email, phone, ip, userAgent, fbp, fbc, eventName, customData, productUrl } = req.body;
        const currentTimestamp = Math.floor(new Date() / 1000);

        // 参数校验，确保所有必需的字段存在
        if (!email || !phone || !ip || !userAgent || !fbp || !fbc || !eventName || !customData || !productUrl) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // 校验 customData 的结构
        if (!customData.currency || !customData.value || !Array.isArray(customData.content_ids) || customData.content_ids.length === 0 || !customData.content_type) {
            return res.status(400).json({ error: 'Invalid customData format' });
        }

        // 构建用户数据对象
        const userData = new bizSdk.UserData()
            .setEmails([hashData(email)])
            .setPhones(phone.map(num => hashData(num)))
            .setClientIpAddress(ip)
            .setClientUserAgent(userAgent)
            .setFbp(fbp)
            .setFbc(fbc);

        // 直接设置 customData 的字段
        const customDataObj = new bizSdk.CustomData()
            .setCurrency(customData.currency)  // 设置货币类型
            .setValue(customData.value)  // 设置商品的价值
            .setContents(customData.content_ids.map(id => new bizSdk.Content().setId(id).setQuantity(1))) // 设置内容（例如产品ID）
            .setContentType(customData.content_type); // 设置内容类型（例如 "product"）

        // 创建 Facebook 事件
        const serverEvent = new bizSdk.ServerEvent()
            .setEventName(eventName)
            .setEventTime(currentTimestamp)
            .setUserData(userData)
            .setCustomData(customDataObj)
            .setEventSourceUrl(productUrl)
            .setActionSource('website');

        // 构建事件请求
        const eventsData = [serverEvent];
        const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
            .setEvents(eventsData);

        // 发送事件到 Facebook
        const response = await eventRequest.execute();
        console.log('Facebook API Response:', response);

        res.json({ status: 'Event sent to Facebook', response });

    } catch (err) {
        console.error('Error sending custom event:', err);

        // 检查错误是否来自 Facebook API 并提供详细错误信息
        if (err.response && err.response.data) {
            res.status(500).json({
                error: 'Failed to send custom event to Facebook',
                details: err.response.data
            });
        } else {
            res.status(500).json({
                error: 'Failed to send custom event to Facebook',
                details: err.message || 'Unknown error occurred'
            });
        }
    }
});

// 哈希函数，用于哈希化数据
function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// 启动服务器
// app.listen(options,port, () => {
//     console.log(`Server is running on http://0.0.0.0:${port}`);
// });
// 创建 HTTPS 服务器并监听 443 端口
server.listen(port, () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});