const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const bizSdk = require('facebook-nodejs-business-sdk');
const crypto = require('crypto');
require('dotenv').config();  // 加载环境变量

const app = express();
const port = 5000;

// 使用 body-parser 解析 JSON 格式的请求体
app.use(bodyParser.json());

// Facebook API 配置
const FB_API_URL = `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PIXEL_ID}/events`;


// 接收参数并调用 Jenkins 接口
app.get('/trigger-build', async (req, res) => {
    const { url, fbc } = req.query;

    if (!url || !fbc) {
        return res.status(400).json({ status: 'failure', message: 'Both URL and FBC are required.' });
    }

    try {
        // 在这里处理Jenkins构建触发逻辑
        const response = await axios.post(
            'http://naturich.top/:8080/job/NaturichProst/buildWithParameters',
            null,
            {
                params: {
                    URL: url,
                    FBC: fbc
                },
                // 其他必要的头部和身份验证信息
                auth: {
                    username: 'cpGo',
                    password: '11967113e707e73e25d451037e620af67e' // 用你的API token替代
                },
            }
        );

        res.json({ status: 'success', message: 'Build triggered successfully' });
    } catch (error) {
        res.status(500).json({ status: 'failure', message: 'Error triggering Jenkins build.', error: error.message });
    }
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
app.post('/purchase', async (req, res) => {
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

    // 获取用户数据
    const userData = (new UserData())
        .setEmails([hashData(email)]) // 从请求参数获取邮件
        .setPhones(phone.map(num => hashData(num))) // 从请求参数获取电话号码
        .setClientIpAddress(ip)  // 从请求参数获取客户端IP地址
        .setClientUserAgent(userAgent) // 从请求参数获取客户端User-Agent
        .setFbp(fbp)  // 从请求参数获取 FBP
        .setFbc(fbc);  // 从请求参数获取 FBC

    // 商品数据
    const content = (new Content())
        .setId(productId) // 从请求参数获取商品ID
        .setQuantity(quantity) // 从请求参数获取商品数量
        .setDeliveryCategory(DeliveryCategory.HOME_DELIVERY);

    const customData = (new CustomData())
        .setContents([content])
        .setCurrency(currency) // 从请求参数获取货币类型
        .setValue(value); // 从请求参数获取商品价值

    // 创建事件
    const serverEvent = (new ServerEvent())
        .setEventName('Purchase')
        .setEventTime(current_timestamp)
        .setUserData(userData)
        .setCustomData(customData)
        .setEventSourceUrl(productUrl) // 从请求参数获取产品URL
        .setActionSource('website');

    const eventsData = [serverEvent];
    const eventRequest = (new EventRequest(access_token, pixel_id))
        .setEvents(eventsData);

    // 执行事件请求
    try {
        const response = await eventRequest.execute();
        console.log('Response: ', response);
        res.json({ status: 'Event sent to Facebook', response });
    } catch (err) {
        console.error('Error: ', err);
        res.status(500).json({ error: 'Failed to send event to Facebook', details: err });
    }
});

// 查看内容事件
app.post('/viewcontent', async (req, res) => {
    const { email, phone, ip, userAgent, fbp, fbc, productId, productUrl } = req.body;
    const currentTimestamp = Math.floor(new Date() / 1000);

    const userData = new bizSdk.UserData()
        .setEmails([hashData(email)])
        .setPhones(phone.map(num => hashData(num)))
        .setClientIpAddress(ip)
        .setClientUserAgent(userAgent)
        .setFbp(fbp)
        .setFbc(fbc);

    const content = new bizSdk.Content()
        .setId(productId);

    const customData = new bizSdk.CustomData()
        .setContents([content]);

    const serverEvent = new bizSdk.ServerEvent()
        .setEventName('ViewContent')
        .setEventTime(currentTimestamp)
        .setUserData(userData)
        .setCustomData(customData)
        .setEventSourceUrl(productUrl)
        .setActionSource('website');

    const eventsData = [serverEvent];
    const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
        .setEvents(eventsData);

    try {
        const response = await eventRequest.execute();
        res.json({ status: 'Event sent to Facebook', response });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send event to Facebook', details: err });
    }
});

//添加到购物车事件
app.post('/addtocart', async (req, res) => {
    const { email, phone, ip, userAgent, fbp, fbc, productId, quantity, productUrl } = req.body;
    const currentTimestamp = Math.floor(new Date() / 1000);

    const userData = new bizSdk.UserData()
        .setEmails([hashData(email)])
        .setPhones(phone.map(num => hashData(num)))
        .setClientIpAddress(ip)
        .setClientUserAgent(userAgent)
        .setFbp(fbp)
        .setFbc(fbc);

    const content = new bizSdk.Content()
        .setId(productId)
        .setQuantity(quantity);

    const customData = new bizSdk.CustomData()
        .setContents([content]);

    const serverEvent = new bizSdk.ServerEvent()
        .setEventName('AddToCart')
        .setEventTime(currentTimestamp)
        .setUserData(userData)
        .setCustomData(customData)
        .setEventSourceUrl(productUrl)
        .setActionSource('website');

    const eventsData = [serverEvent];
    const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
        .setEvents(eventsData);

    try {
        const response = await eventRequest.execute();
        res.json({ status: 'Event sent to Facebook', response });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send event to Facebook', details: err });
    }
});

//添加到愿望清单事件
app.post('/addtowishlist', async (req, res) => {
    const { email, phone, ip, userAgent, fbp, fbc, productId, productUrl } = req.body;
    const currentTimestamp = Math.floor(new Date() / 1000);

    const userData = new bizSdk.UserData()
        .setEmails([hashData(email)])
        .setPhones(phone.map(num => hashData(num)))
        .setClientIpAddress(ip)
        .setClientUserAgent(userAgent)
        .setFbp(fbp)
        .setFbc(fbc);

    const content = new bizSdk.Content()
        .setId(productId);

    const customData = new bizSdk.CustomData()
        .setContents([content]);

    const serverEvent = new bizSdk.ServerEvent()
        .setEventName('AddToWishlist')
        .setEventTime(currentTimestamp)
        .setUserData(userData)
        .setCustomData(customData)
        .setEventSourceUrl(productUrl)
        .setActionSource('website');

    const eventsData = [serverEvent];
    const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
        .setEvents(eventsData);

    try {
        const response = await eventRequest.execute();
        res.json({ status: 'Event sent to Facebook', response });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send event to Facebook', details: err });
    }
});

//开始结账事件
app.post('/initiatecheckout', async (req, res) => {
    const { email, phone, ip, userAgent, fbp, fbc, productId, quantity, value, currency, productUrl } = req.body;
    const currentTimestamp = Math.floor(new Date() / 1000);

    const userData = new bizSdk.UserData()
        .setEmails([hashData(email)])
        .setPhones(phone.map(num => hashData(num)))
        .setClientIpAddress(ip)
        .setClientUserAgent(userAgent)
        .setFbp(fbp)
        .setFbc(fbc);

    const content = new bizSdk.Content()
        .setId(productId)
        .setQuantity(quantity);

    const customData = new bizSdk.CustomData()
        .setContents([content])
        .setValue(value)
        .setCurrency(currency);

    const serverEvent = new bizSdk.ServerEvent()
        .setEventName('InitiateCheckout')
        .setEventTime(currentTimestamp)
        .setUserData(userData)
        .setCustomData(customData)
        .setEventSourceUrl(productUrl)
        .setActionSource('website');

    const eventsData = [serverEvent];
    const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
        .setEvents(eventsData);

    try {
        const response = await eventRequest.execute();
        res.json({ status: 'Event sent to Facebook', response });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send event to Facebook', details: err });
    }
});

//潜在客户事件
app.post('/lead', async (req, res) => {
    const { email, phone, ip, userAgent, fbp, fbc, leadUrl } = req.body;
    const currentTimestamp = Math.floor(new Date() / 1000);

    const userData = new bizSdk.UserData()
        .setEmails([hashData(email)])
        .setPhones(phone.map(num => hashData(num)))
        .setClientIpAddress(ip)
        .setClientUserAgent(userAgent)
        .setFbp(fbp)
        .setFbc(fbc);

    const serverEvent = new bizSdk.ServerEvent()
        .setEventName('Lead')
        .setEventTime(currentTimestamp)
        .setUserData(userData)
        .setEventSourceUrl(leadUrl)
        .setActionSource('website');

    const eventsData = [serverEvent];
    const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
        .setEvents(eventsData);

    try {
        const response = await eventRequest.execute();
        res.json({ status: 'Event sent to Facebook', response });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send event to Facebook', details: err });
    }
});

//自定义事件
app.post('/customevent', async (req, res) => {
    const { email, phone, ip, userAgent, fbp, fbc, eventName, customData, productUrl } = req.body;
    const currentTimestamp = Math.floor(new Date() / 1000);

    // 校验传入的事件名称和自定义数据
    if (!eventName || !customData) {
        return res.status(400).json({ error: 'Event name and custom data are required' });
    }

    const userData = new bizSdk.UserData()
        .setEmails([hashData(email)])
        .setPhones(phone.map(num => hashData(num)))
        .setClientIpAddress(ip)
        .setClientUserAgent(userAgent)
        .setFbp(fbp)
        .setFbc(fbc);

    const customDataObj = new bizSdk.CustomData()
        .setData(customData);  // 假设 customData 是一个对象，包含事件相关数据

    const serverEvent = new bizSdk.ServerEvent()
        .setEventName(eventName)
        .setEventTime(currentTimestamp)
        .setUserData(userData)
        .setCustomData(customDataObj)
        .setEventSourceUrl(productUrl)
        .setActionSource('website');

    const eventsData = [serverEvent];
    const eventRequest = new bizSdk.EventRequest(process.env.FACEBOOK_ACCESS_TOKEN, process.env.FACEBOOK_PIXEL_ID)
        .setEvents(eventsData);

    try {
        const response = await eventRequest.execute();
        res.json({ status: 'Event sent to Facebook', response });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send custom event to Facebook', details: err });
    }
});

// 哈希函数，用于哈希化数据
function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}


// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
