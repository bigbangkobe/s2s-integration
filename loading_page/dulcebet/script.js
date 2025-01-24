document.getElementById('downloadButton').addEventListener('click', async () => {
    const url = 'https://www.example.com';  // 你可以动态获取或用户输入
    const fbc = '456';  // 你可以动态获取或用户输入

    // 获取会话 ID
    let sessionId = null;
    try {
        const sessionResponse = await fetch('https://naturich.top:5000/generate-session-id');
        const sessionData = await sessionResponse.json();
        sessionId = sessionData.sessionId;
        console.log('Generated session ID:', sessionId);
    } catch (error) {
        alert('Failed to generate session ID.');
        return;
    }

    // 显示加载进度
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('progressContainer').style.display = 'block';

    try {
        // 发送请求到后端，触发 Jenkins 打包，并传递会话ID
        const response = await fetch(`https://naturich.top:5000/trigger-build?url=${url}&fbc=${fbc}&sessionId=${sessionId}`);
        const data = await response.json();

        if (data.status === 'success') {
            const buildNumber = data.build.buildNumber;

            // 建立 WebSocket 连接，并携带会话ID
            const socket = new WebSocket(`ws://naturich.top:5001?sessionId=${sessionId}`);  // 将会话ID作为查询参数传递

            socket.onopen = () => {
                console.log('WebSocket connected');
            };

            socket.onmessage = (event) => {
                const progressData = JSON.parse(event.data);

                if (progressData.progressPercentage !== undefined) {
                    const progress = progressData.progressPercentage;
                    document.getElementById('progressBar').style.width = progress + '%';
                    document.getElementById('progressText').textContent = progress + '%';

                    // 如果打包完成，显示下载链接
                    if (progress === 100) {
                        document.getElementById('loadingOverlay').style.display = 'none';
                        document.getElementById('downloadSection').style.display = 'block';
                        document.getElementById('downloadLink').href = progressData.downloadUrl;  // 设置下载链接
                    }
                }

                if (progressData.status && progressData.status !== 'In Progress') {
                    console.log('Build completed: ', progressData.status);
                    socket.close();  // 关闭 WebSocket 连接
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                alert('WebSocket error occurred');
                document.getElementById('loadingOverlay').style.display = 'none';
            };

            socket.onclose = () => {
                console.log('WebSocket closed');
            };
        } else {
            alert('Failed to trigger build');
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Something went wrong.');
        document.getElementById('loadingOverlay').style.display = 'none';
    }
});
