let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user'));
let currentUserId = null;

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function toggleDropdown() {
    const menu = document.getElementById('userDropdownMenu');
    menu.classList.toggle('show');
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown.contains(e.target)) {
        const menu = document.getElementById('userDropdownMenu');
        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    }
});

function logout() {
    token = null;
    user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function goToMember() {
    window.location.href = 'member.html';
}

window.onload = function() {
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('navUserName').textContent = user.username;
    currentUserId = user.id;

    if (user && user.is_admin) {
        document.getElementById('navMember').style.display = 'inline-block';
        document.getElementById('menuMember').style.display = 'block';
    }

    loadLeaderboard();
};

async function loadLeaderboard() {
    try {
        const response = await fetch('http://localhost:3001/api/quiz/leaderboard');
        const data = await response.json();

        let leaderboardHTML = '';
        if (data.leaderboard && Array.isArray(data.leaderboard)) {
            data.leaderboard.forEach((item, index) => {
                let medalIcon = '';
                let medalClass = '';
                if (index === 0) {
                    medalIcon = '🥇';
                    medalClass = 'medal-1';
                } else if (index === 1) {
                    medalIcon = '🥈';
                    medalClass = 'medal-2';
                } else if (index === 2) {
                    medalIcon = '🥉';
                    medalClass = 'medal-3';
                }
                
                const userId = item.user_id;
                const canPostSpeech = userId && parseInt(userId) == parseInt(currentUserId);
                const hasSpeech = item.has_speech || false;
                const profilePicture = item.profile_picture || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=profile%20picture%20of%20a%20student&image_size=square';
                
                leaderboardHTML += `
                    <div class="leaderboard-card">
                        <div class="card-image">
                            <img src="${profilePicture}" alt="${item.username}" ${canPostSpeech ? 'onclick="openProfilePictureModal()" style="cursor: pointer;"' : ''}>
                            <div class="card-rank ${medalClass}">${medalIcon || (index + 1)}</div>
                        </div>
                        <div class="card-content">
                            <h4>${item.username}</h4>
                            <p class="card-score">${item.highest_score}分 (提示: ${item.hints_used}次)</p>
                            <div class="card-speech" id="speech-${userId || index}">
                                <!-- Speech will be loaded here -->
                            </div>
                            ${canPostSpeech ? `<button class="btn btn-sm" onclick="openSpeechModal(${userId})">${hasSpeech ? '修改个性签名' : '发表个性签名'}</button>` : ''}
                        </div>
                    </div>
                `;
            });
        } else {
            leaderboardHTML = '<div style="text-align: center; color: #666; padding: 50px;">暂无排行榜数据</div>';
        }
        document.getElementById('leaderboardList').innerHTML = leaderboardHTML;
        
        // Load speeches for each user
        if (data.leaderboard && Array.isArray(data.leaderboard)) {
            data.leaderboard.forEach((item, index) => {
                if (item && item.user_id != null && item.user_id !== '') {
                    loadUserSpeech(item.user_id, index);
                }
            });
        }
    } catch (error) {
        console.error('加载排行榜失败:', error);
        document.getElementById('leaderboardList').innerHTML = '<div style="text-align: center; color: #666; padding: 50px;">加载排行榜失败</div>';
    }
}

// 打开头像上传模态框
function openProfilePictureModal() {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'profilePictureModal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeProfilePictureModal()">&times;</span>
            <h3>上传头像</h3>
            <div style="margin: 20px 0;">
                <div id="dropArea" style="border: 2px dashed #ddd; border-radius: 10px; padding: 30px; text-align: center; cursor: pointer;">
                    <p style="margin-bottom: 10px;">拖拽图片到这里，或点击选择文件</p>
                    <input type="file" id="profilePictureFile" accept="image/*" style="display: none;">
                    <button onclick="document.getElementById('profilePictureFile').click()" class="btn btn-sm">选择文件</button>
                    <p id="fileName" style="margin-top: 10px; color: #666;"></p>
                </div>
            </div>
            <button onclick="uploadProfilePicture()" class="btn">上传</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 点击模态框外部关闭
    window.onclick = function(event) {
        if (event.target == modal) {
            closeProfilePictureModal();
        }
    };
    
    // 初始化拖拽功能
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('profilePictureFile');
    const fileName = document.getElementById('fileName');
    
    // 点击选择文件
    dropArea.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') return; // 按钮已经有自己的点击事件
        if (e.target !== dropArea && e.target.tagName !== 'P') return;
        fileInput.click();
    });
    
    // 防止按钮点击事件冒泡到dropArea
    document.getElementById('profilePictureFile').parentElement.querySelector('button').addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 文件选择
    fileInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            fileName.textContent = this.files[0].name;
        }
    });
    
    // 拖拽事件
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 拖拽高亮
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.style.borderColor = '#667eea';
        dropArea.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
    }
    
    function unhighlight() {
        dropArea.style.borderColor = '#ddd';
        dropArea.style.backgroundColor = 'transparent';
    }
    
    // 处理文件放置
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            fileName.textContent = files[0].name;
        }
    }
}

// 关闭头像上传模态框
function closeProfilePictureModal() {
    const modal = document.getElementById('profilePictureModal');
    if (modal) {
        modal.remove();
    }
}

// 上传头像
async function uploadProfilePicture() {
    const fileInput = document.getElementById('profilePictureFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('请选择要上传的图片');
        return;
    }
    
    const file = fileInput.files[0];
    
    // 检查文件大小
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('图片大小不能超过5MB');
        return;
    }
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件');
        return;
    }
    
    // 转换为base64
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        
        try {
            const response = await fetch('http://localhost:3001/api/auth/profile-picture', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ profile_picture: base64Image })
            });
            
            const data = await response.json();
            if (data.error) {
                showToast(data.error);
            } else {
                showToast('头像上传成功');
                closeProfilePictureModal();
                // 重新加载排行榜以显示新头像
                loadLeaderboard();
            }
        } catch (error) {
            showToast('上传失败，请确保服务器已启动');
            console.error(error);
        }
    };
    
    reader.onerror = function() {
        showToast('图片读取失败');
    };
    
    reader.readAsDataURL(file);
}
async function loadUserSpeech(userId, index) {
    try {
        const response = await fetch(`http://localhost:3001/api/leaderboard/speeches?user_id=${userId}`);
        const data = await response.json();
        
        const speechContainer = document.getElementById(`speech-${userId || index}`);
        if (speechContainer) {
            if (data.speeches && data.speeches.length > 0) {
                const speech = data.speeches[0];
                speechContainer.innerHTML = `
                    <p class="speech-text">${speech.content}</p>
                    <div class="speech-actions">
                        <button class="action-btn" onclick="likeSpeech(${speech.id}, this)">
                            <span>👍</span>
                            <span>${speech.like_count || 0}</span>
                        </button>
                        <button class="action-btn" onclick="dislikeSpeech(${speech.id}, this)">
                            <span>👎</span>
                            <span>${speech.dislike_count || 0}</span>
                        </button>
                        <button class="action-btn" onclick="toggleComments(${speech.id}, this)">
                            <span>💬</span>
                            <span>评论</span>
                        </button>
                    </div>
                    <div class="comments-section" id="comments-${speech.id}" style="display: none;">
                        <h4>评论</h4>
                        <div id="comments-list-${speech.id}"></div>
                        <div class="comment-form">
                            <input type="text" id="comment-input-${speech.id}" placeholder="写下你的评论...">
                            <button onclick="addComment(${speech.id})">↩发送</button>
                        </div>
                    </div>
                `;
                // Add has_speech class to the card
                const card = speechContainer.closest('.leaderboard-card');
                if (card) {
                    card.classList.add('has-speech');
                }
            } else {
                speechContainer.innerHTML = '<p class="no-speech">暂无个性签名</p>';
            }
        }
    } catch (error) {
        console.error('加载个性签名失败:', error);
    }
}

async function likeSpeech(speechId, button) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('请先登录');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/leaderboard/speeches/${speechId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.error) {
            showToast(data.error);
        } else {
            showToast('点赞成功');
            button.classList.add('liked');
            // Update like count
            const likeCount = button.querySelector('span:nth-child(2)');
            likeCount.textContent = parseInt(likeCount.textContent) + 1;
        }
    } catch (error) {
        showToast('点赞失败，请确保服务器已启动');
        console.error(error);
    }
}

async function dislikeSpeech(speechId, button) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('请先登录');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/leaderboard/speeches/${speechId}/dislike`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.error) {
            showToast(data.error);
        } else {
            showToast('踩成功');
            button.classList.add('disliked');
            // Update dislike count
            const dislikeCount = button.querySelector('span:nth-child(2)');
            dislikeCount.textContent = parseInt(dislikeCount.textContent) + 1;
        }
    } catch (error) {
        showToast('踩失败，请确保服务器已启动');
        console.error(error);
    }
}

function toggleComments(speechId, button) {
    const commentsSection = document.getElementById(`comments-${speechId}`);
    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
        loadComments(speechId);
    } else {
        commentsSection.style.display = 'none';
    }
}

async function loadComments(speechId) {
    try {
        const response = await fetch(`http://localhost:3001/api/leaderboard/speeches/${speechId}/comments`);
        const data = await response.json();

        let commentsHTML = '';
        if (data.comments && Array.isArray(data.comments)) {
            data.comments.forEach(comment => {
                const date = new Date(comment.created_at + 'Z');
                const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                commentsHTML += `
                    <div class="comment-item">
                        <div class="comment-author">${comment.username}</div>
                        <div class="comment-content">${comment.content}</div>
                        <div class="comment-time">${formattedDate}</div>
                    </div>
                `;
            });
        } else {
            commentsHTML = '<div style="text-align: center; color: #666; font-size: 13px;">暂无评论</div>';
        }
        document.getElementById(`comments-list-${speechId}`).innerHTML = commentsHTML;
    } catch (error) {
        console.error('加载评论失败:', error);
        document.getElementById(`comments-list-${speechId}`).innerHTML = '<div style="text-align: center; color: #666; font-size: 13px;">加载评论失败</div>';
    }
}

async function addComment(speechId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('请先登录');
        return;
    }

    const content = document.getElementById(`comment-input-${speechId}`).value.trim();
    if (!content) {
        showToast('评论内容不能为空');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/leaderboard/speeches/${speechId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();
        if (data.error) {
            showToast(data.error);
        } else {
            showToast('评论成功');
            document.getElementById(`comment-input-${speechId}`).value = '';
            loadComments(speechId);
        }
    } catch (error) {
        showToast('评论失败，请确保服务器已启动');
        console.error(error);
    }
}

function openSpeechModal(userId) {
    document.getElementById('speechModal').style.display = 'block';
    document.getElementById('speechContent').value = '';
}

function closeSpeechModal() {
    document.getElementById('speechModal').style.display = 'none';
}

async function submitSpeech() {
    const content = document.getElementById('speechContent').value.trim();
    if (!content) {
        showToast('请输入个性签名');
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/leaderboard/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();
        if (data.error) {
            showToast(data.error);
        } else {
            showToast('发表成功');
            closeSpeechModal();
            // Refresh leaderboard after submitting speech
            loadLeaderboard();
        }
    } catch (error) {
        showToast('发表失败，请确保服务器已启动');
        console.error(error);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('speechModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};