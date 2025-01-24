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

    // 获取用户数据
    const userData = (new UserData())
        .setEmails([hashData('joe@eg.com')])
        .setPhones([hashData('12345678901'), hashData('14251234567')])
        // It is recommended to send Client IP and User Agent for Conversions API Events.
        .setClientIpAddress(req.ip)  // 使用req而不是request
        .setClientUserAgent(req.headers['user-agent'])      // 使用req而不是request
        .setFbp('fb.1.1558571054389.1098115397')
        .setFbc('fb.1.1554763741205.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890');

    // 商品数据
    const content = (new Content())
        .setId('product123')
        .setQuantity(1)
        .setDeliveryCategory(DeliveryCategory.HOME_DELIVERY);

    const customData = (new CustomData())
        .setContents([content])
        .setCurrency('usd')
        .setValue(123.45);

    // 创建事件
    const serverEvent = (new ServerEvent())
        .setEventName('Purchase')
        .setEventTime(current_timestamp)
        .setUserData(userData)
        .setCustomData(customData)
        .setEventSourceUrl('http://jaspers-market.com/product/123')
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


// 应用安装事件
app.post('/app_install', async (req, res) => {
    const { external_id, device_id, platform } = req.body;
    if (!external_id || !device_id || !platform) {
        return res.status(400).json({ error: "external_id, device_id, and platform are required" });
    }

    const eventData = {
        event_name: "INSTALL",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending install event.' });
    }
});

// 应用激活事件
app.post('/app_activate', async (req, res) => {
    const { external_id, device_id, platform } = req.body;
    if (!external_id || !device_id || !platform) {
        return res.status(400).json({ error: "external_id, device_id, and platform are required" });
    }

    const eventData = {
        event_name: "ACTIVATE",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending activate event.' });
    }
});


// 添加到购物车事件
app.post('/add_to_cart', async (req, res) => {
    const { external_id, device_id, platform, content_ids, value, currency } = req.body;
    if (!external_id || !device_id || !platform || !content_ids || !value || !currency) {
        return res.status(400).json({ error: "external_id, device_id, platform, content_ids, value, and currency are required" });
    }

    const eventData = {
        event_name: "ADD_TO_CART",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
        content_ids: content_ids,
        value_to_sum: value,
        currency: currency,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending add to cart event.' });
    }
});

// 添加到愿望单事件
app.post('/add_to_wishlist', async (req, res) => {
    const { external_id, device_id, platform, content_ids, currency } = req.body;
    if (!external_id || !device_id || !platform || !content_ids || !currency) {
        return res.status(400).json({ error: "external_id, device_id, platform, content_ids, and currency are required" });
    }

    const eventData = {
        event_name: "ADD_TO_WISHLIST",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
        content_ids: content_ids,
        currency: currency,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending add to wishlist event.' });
    }
});

// 开始结账事件
app.post('/initiate_checkout', async (req, res) => {
    const { external_id, device_id, platform, value, currency } = req.body;
    if (!external_id || !device_id || !platform || !value || !currency) {
        return res.status(400).json({ error: "external_id, device_id, platform, value, and currency are required" });
    }

    const eventData = {
        event_name: "INITIATE_CHECKOUT",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
        value_to_sum: value,
        currency: currency,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending initiate checkout event.' });
    }
});

// 搜索事件
app.post('/search', async (req, res) => {
    const { external_id, device_id, platform, search_string } = req.body;
    if (!external_id || !device_id || !platform || !search_string) {
        return res.status(400).json({ error: "external_id, device_id, platform, and search_string are required" });
    }

    const eventData = {
        event_name: "SEARCH",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
        search_string: search_string,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending search event.' });
    }
});

// 查看内容事件
app.post('/view_content', async (req, res) => {
    const { external_id, device_id, platform, content_ids } = req.body;
    if (!external_id || !device_id || !platform || !content_ids) {
        return res.status(400).json({ error: "external_id, device_id, platform, and content_ids are required" });
    }

    const eventData = {
        event_name: "VIEW_CONTENT",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
        content_ids: content_ids,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending view content event.' });
    }
});

// 完成注册事件
app.post('/complete_registration', async (req, res) => {
    const { external_id, device_id, platform } = req.body;
    if (!external_id || !device_id || !platform) {
        return res.status(400).json({ error: "external_id, device_id, and platform are required" });
    }

    const eventData = {
        event_name: "COMPLETE_REGISTRATION",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending complete registration event.' });
    }
});

// 潜在客户事件
app.post('/lead', async (req, res) => {
    const { external_id, device_id, platform } = req.body;
    if (!external_id || !device_id || !platform) {
        return res.status(400).json({ error: "external_id, device_id, and platform are required" });
    }

    const eventData = {
        event_name: "LEAD",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending lead event.' });
    }
});

// 安排事件
app.post('/schedule', async (req, res) => {
    const { external_id, device_id, platform } = req.body;
    if (!external_id || !device_id || !platform) {
        return res.status(400).json({ error: "external_id, device_id, and platform are required" });
    }

    const eventData = {
        event_name: "SCHEDULE",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending schedule event.' });
    }
});

// 提交申请事件
app.post('/submit_application', async (req, res) => {
    const { external_id, device_id, platform } = req.body;
    if (!external_id || !device_id || !platform) {
        return res.status(400).json({ error: "external_id, device_id, and platform are required" });
    }

    const eventData = {
        event_name: "SUBMIT_APPLICATION",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending submit application event.' });
    }
});

// 订阅事件
app.post('/subscribe', async (req, res) => {
    const { external_id, device_id, platform } = req.body;
    if (!external_id || !device_id || !platform) {
        return res.status(400).json({ error: "external_id, device_id, and platform are required" });
    }

    const eventData = {
        event_name: "SUBSCRIBE",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending subscribe event.' });
    }
});

// 自定义产品事件
app.post('/customize_product', async (req, res) => {
    const { external_id, device_id, platform, content_ids } = req.body;
    if (!external_id || !device_id || !platform || !content_ids) {
        return res.status(400).json({ error: "external_id, device_id, platform, and content_ids are required" });
    }

    const eventData = {
        event_name: "CUSTOMIZE_PRODUCT",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
        content_ids: content_ids,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending customize product event.' });
    }
});

function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
