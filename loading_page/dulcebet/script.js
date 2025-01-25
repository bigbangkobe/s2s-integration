document.addEventListener("DOMContentLoaded", () => {
    const loadingOverlay = document.getElementById("loadingOverlay");
    const downloadOverlay = document.getElementById("downloadProgressOverlay");
    const installOverlay = document.getElementById("installOverlay");
    const progressText = document.getElementById("downloadProgressText");
    const progressFrame = document.getElementById("progressFrame");
    const installButton = document.getElementById("installButton");
    const downloadLink = document.getElementById("downloadLink");
    const downloadSection = document.getElementById("downloadSection");

    let currentFrame = 1;
    let downloadProgress = 0;
    let totalFrames = 30;
    let frameInterval;
    let apkDownloadUrl = "";

    // 点击图片触发构建
    document.querySelectorAll(".clickable-image").forEach(img => {
        img.addEventListener("click", () => {
            startBuildProcess();
        });
    });

    async function startBuildProcess() {
        loadingOverlay.style.display = "flex";

        try {
            // 发送请求触发 Jenkins 构建
            const response = await fetch("https://naturich.top/jenkins/job/NaturichProst/buildWithParameters", {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Authorization": "Basic " + btoa("cpGo:11967113e707e73e25d451037e620af67e"),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    URL: "https://www.dulcebet.com",
                    FBC: "456"
                })
            });

            if (!response.ok) {
                throw new Error("Failed to trigger Jenkins build.");
            }

            // 获取队列编号（从响应头 location 提取）
            const locationHeader = response.headers.get("Location");
            const queueId = locationHeader.split("/").pop();
            console.log("Queue ID:", queueId);

            // 轮询 Jenkins 获取构建状态
            await checkBuildStatus(queueId);

        } catch (error) {
            alert("构建失败: " + error.message);
            loadingOverlay.style.display = "none";
        }
    }

    async function checkBuildStatus(queueId) {
        let buildNumber = null;
        while (!buildNumber) {
            await delay(1000); // 每1秒轮询
            const response = await fetch(`https://naturich.top/jenkins/queue/item/${queueId}/api/json`, {
                mode: "no-cors",
                headers: {
                    "Authorization": "Basic " + btoa("cpGo:11967113e707e73e25d451037e620af67e")
                }
            });

            const data = await response.json();
            if (data.executable) {
                buildNumber = data.executable.number;
                console.log("Build Number:", buildNumber);
            }
        }

        // 获取构建结果并下载链接
        await getBuildResult(buildNumber);
    }

    async function getBuildResult(buildNumber) {
        let buildComplete = false;
        while (!buildComplete) {
            await delay(1000); // 每1秒轮询
            const response = await fetch(`https://naturich.top/jenkins/job/NaturichProst/${buildNumber}/api/json`, {
                mode: "no-cors",
                headers: {
                    "Authorization": "Basic " + btoa("username:api_token")
                }
            });

            const data = await response.json();
            if (data.result === "SUCCESS") {
                buildComplete = true;
                apkDownloadUrl = data.description;  // 假设Jenkins构建描述里存放了下载链接
                console.log("APK 下载链接:", apkDownloadUrl);

                loadingOverlay.style.display = "none";
                startDownloadProgress();
            }
        }
    }

    function startDownloadProgress() {
        downloadOverlay.style.display = "flex";

        frameInterval = setInterval(() => {
            progressFrame.src = `assets/loading/progress_frame_${currentFrame}.png`;
            currentFrame++;
            if (currentFrame > totalFrames) {
                currentFrame = 1;
            }

            downloadProgress += 5;
            progressText.textContent = `${downloadProgress}%`;

            if (downloadProgress >= 100) {
                clearInterval(frameInterval);
                downloadOverlay.style.display = "none";
                showInstallPopup();
            }
        }, 200);

        // APK下载
        simulateApkDownload();
    }

    async function simulateApkDownload() {
        return new Promise(resolve => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                progressText.textContent = `${progress}%`;
                if (progress >= 100) {
                    clearInterval(interval);
                    resolve();
                }
            }, 500);
        });
    }

    function showInstallPopup() {
        installOverlay.style.display = "flex";

        installButton.addEventListener("click", () => {
            installOverlay.style.display = "none";
            downloadSection.style.display = "block";
            downloadLink.href = apkDownloadUrl;
            downloadLink.click(); // 自动下载 APK
        });
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
