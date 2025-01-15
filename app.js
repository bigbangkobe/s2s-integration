const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();  // 加载环境变量

const app = express();
const port = 5000;

// 使用 body-parser 解析 JSON 格式的请求体
app.use(bodyParser.json());

// Facebook API 配置
const FB_API_URL = `https://graph.facebook.com/v13.0/${process.env.FACEBOOK_APP_ID}/app_events`;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

// 接收参数并调用 Jenkins 接口
app.get('/trigger-build', async (req, res) => {
    const { url, fbc } = req.query;

    if (!url || !fbc) {
        return res.status(400).json({ status: 'failure', message: 'Both URL and FBC are required.' });
    }

    try {
        // 在这里处理Jenkins构建触发逻辑
        const response = await axios.post(
            'http://216.238.87.164:8080/job/NaturichProst/buildWithParameters',
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
                // headers: {
                //     'Content-Type': 'application/x-www-form-urlencoded',
                //     'Cookie': 'remember-me=Y3BnbzoxNzM3OTgxMzk3MTU0OmVlZGUwMWFjZmY4YWJkMWVhN2JhMjJmMjk4OTVjYzk2ZGNlZDZkZDM5MzhkZGFhNDIzY2E3YWI2NWU4YmU0MTI; JSESSIONID.3b0775a8=node019klya7rmu2esph6cq7gzmvc93.node0',
                //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                //     'Origin': 'http://216.238.87.164:8080',
                //     'Referer': `http://216.238.87.164:8080/job/NaturichProst/buildWithParameters?URL=${url}&FBC=${fbc}`
                // }
            }
        );

        res.json({ status: 'success', message: 'Build triggered successfully' });
    } catch (error) {
        res.status(500).json({ status: 'failure', message: 'Error triggering Jenkins build.', error: error.message });
    }
});



// 发送事件到 Facebook 的函数
const sendEventToFacebook = async (eventData) => {
    try {
        const response = await axios.post(FB_API_URL, {
            data: [eventData],
            access_token: ACCESS_TOKEN,
        });
        return response.data;
    } catch (error) {
        console.error('Error sending event to Facebook:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// ------------------------- 标准事件 -------------------------

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

// 购买事件
app.post('/purchase', async (req, res) => {
    const { external_id, device_id, platform, value, currency, transaction_id } = req.body;
    if (!external_id || !device_id || !platform || !value || !currency || !transaction_id) {
        return res.status(400).json({ error: "external_id, device_id, platform, value, currency, and transaction_id are required" });
    }

    const eventData = {
        event_name: "PURCHASE",
        user_data: {
            external_id,
            device_id,
        },
        event_time: Math.floor(Date.now() / 1000),
        app_version: "1.0.0",
        platform: platform,
        value_to_sum: value,
        currency: currency,
        transaction_id,
    };

    try {
        const fbResponse = await sendEventToFacebook(eventData);
        return res.json({ status: 'success', response: fbResponse });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: 'Error sending purchase event.' });
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

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
