let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user'));
let questions = [];
let answers = {};
let correctAnswers = {};
let currentSeed = null;
let hintsUsed = {};
let displayMode = 'single';

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
    if (dropdown && !dropdown.contains(e.target)) {
        const menu = document.getElementById('userDropdownMenu');
        if (menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    }
});

// 页面加载时检查登录状态
window.onload = function() {
    if (token) {
        showStartScreen();
    } else {
        window.location.href = 'login.html';
    }
};



function logout() {
    token = null;
    user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function showStartScreen() {
    document.getElementById('startScreen').classList.add('active');
    document.getElementById('submitContainer').style.display = 'none';
    document.getElementById('navUserName').textContent = user ? user.username : '用户';
    document.getElementById('navHome').classList.add('active');
    document.getElementById('navProfile').classList.remove('active');
    document.getElementById('navLeaderboard').classList.remove('active');

    if (user && user.is_admin) {
        document.getElementById('navMember').style.display = 'inline-block';
        document.getElementById('menuMember').style.display = 'block';
    }

    loadVictorySpeeches();
}

function goToMember() {
    window.location.href = 'member.html';
}

function showProfile() {
    window.location.href = 'profile.html';
}

function goToStart() {
    document.getElementById('resultScreen').classList.remove('active');
    document.getElementById('startScreen').classList.add('active');
}

async function loadLeaderboard(containerId = 'leaderboardList') {
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
                leaderboardHTML += `
                    <div class="leaderboard-item">
                        <span class="leaderboard-rank ${medalClass}">${medalIcon || index + 1}</span>
                        <span>${item.username}</span>
                        <span>${item.highest_score}分 (提示: ${item.hints_used}次)</span>
                    </div>
                `;
            });
        } else {
            leaderboardHTML = '<div style="text-align: center; color: #666;">暂无排行榜数据</div>';
        }
        document.getElementById(containerId).innerHTML = leaderboardHTML;
    } catch (error) {
        console.error('加载排行榜失败:', error);
        document.getElementById(containerId).innerHTML = '<div style="text-align: center; color: #666;">加载排行榜失败</div>';
    }
}

async function loadVictorySpeeches() {
    try {
        const response = await fetch('http://localhost:3001/api/leaderboard/speeches');
        const data = await response.json();

        let speechesHTML = '';
        if (data.speeches && Array.isArray(data.speeches)) {
            data.speeches.forEach(speech => {
                const date = new Date(speech.created_at + 'Z');
                const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                speechesHTML += `
                    <div class="speech-item">
                        <div class="speech-author">${speech.username}</div>
                        <div class="speech-content">${speech.content}</div>
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
                                <button onclick="addComment(${speech.id})">↩</button>
                            </div>
                        </div>
                        <div class="speech-time">${formattedDate}</div>
                    </div>
                `;
            });
        } else {
            speechesHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无个性签名</div>';
        }
        document.getElementById('speechesContainer').innerHTML = speechesHTML;
        initDragScroll();
    } catch (error) {
        console.error('加载个性签名失败:', error);
        document.getElementById('speechesContainer').innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">加载个性签名失败</div>';
    }
}

// 初始化拖拽滚动
function initDragScroll() {
    const container = document.querySelector('.speeches-container');
    const scrollContent = document.getElementById('speechesContainer');
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;
    let autoScrollInterval;
    let autoScrollTimeout;
    let contentHeight = 0;
    let containerHeight = 0;

    // 复制内容以实现无缝滚动
    function duplicateContent() {
        if (scrollContent.children.length > 0) {
            contentHeight = scrollContent.offsetHeight;
            containerHeight = container.offsetHeight;
            
            // 只有当内容高度大于容器高度时才复制
            if (contentHeight > containerHeight) {
                // 克隆内容并添加到容器末尾
                const clone = scrollContent.cloneNode(true);
                clone.id = 'speechesContainerClone';
                scrollContent.parentNode.appendChild(clone);
            }
        }
    }

    // 开始拖拽
    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startScrollTop = container.scrollTop;
        clearInterval(autoScrollInterval);
        clearTimeout(autoScrollTimeout);
        container.style.cursor = 'grabbing';
    });

    // 鼠标移动
    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const y = e.clientY;
        const deltaY = y - startY;
        container.scrollTop = startScrollTop - deltaY;
    });

    // 结束拖拽
    container.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
        startAutoScroll();
    });

    // 鼠标离开
    container.addEventListener('mouseleave', () => {
        isDragging = false;
        container.style.cursor = 'grab';
        startAutoScroll();
    });

    // 滚动事件处理 - 实现无缝滚动
    container.addEventListener('scroll', () => {
        if (contentHeight > 0 && containerHeight > 0) {
            // 当滚动到复制内容的开始时，重置滚动位置
            if (container.scrollTop >= contentHeight) {
                container.scrollTop = container.scrollTop - contentHeight;
            }
        }
    });

    // 开始自动滚动
    function startAutoScroll() {
        clearTimeout(autoScrollTimeout);
        autoScrollTimeout = setTimeout(() => {
            autoScrollInterval = setInterval(() => {
                container.scrollTop += 1;
                // 实现无缝滚动
                if (contentHeight > 0 && containerHeight > 0 && container.scrollTop >= contentHeight) {
                    container.scrollTop = 0;
                }
            }, 50);
        }, 3000);
    }

    // 初始化
    setTimeout(() => {
        duplicateContent();
        startAutoScroll();
    }, 100);
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

async function loadHistoryScores() {
    try {
        const response = await fetch('http://localhost:3001/api/quiz/history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        const scores = data.history.map(item => item.score);
        const dates = data.history.map(item => {
            const date = new Date(item.created_at + 'Z');
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });

        const ctx = document.getElementById('scoreChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates.reverse(),
                datasets: [{
                    label: '历史分数',
                    data: scores.reverse(),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: '最近20次答题分数'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    } catch (error) {
        console.error('加载历史分数失败:', error);
    }
}

async function loadHistoryScoresList() {
    try {
        const response = await fetch('http://localhost:3001/api/quiz/history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        let historyHTML = '';
        if (data.history && Array.isArray(data.history)) {
            data.history.forEach((item, index) => {
                const date = new Date(item.created_at + 'Z');
                const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                historyHTML += `
                    <div class="history-score-item">
                        <span class="history-score-rank">${index + 1}</span>
                        <span class="history-score-date">${formattedDate}</span>
                        <span class="history-score-value">${item.score}分</span>
                        ${item.hints_used ? `<span class="history-score-hints">提示: ${item.hints_used}次</span>` : ''}
                    </div>
                `;
            });
        } else {
            historyHTML = '<div style="text-align: center; color: #666;">暂无历史分数数据</div>';
        }
        document.getElementById('historyScoresList').innerHTML = historyHTML;
    } catch (error) {
        console.error('加载历史分数列表失败:', error);
        document.getElementById('historyScoresList').innerHTML = '<div style="text-align: center; color: #666;">加载历史分数失败</div>';
    }
}

async function startQuiz() {
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('quizScreen').classList.add('active');
    document.getElementById('submitContainer').style.display = 'block';
    document.getElementById('navUserName').textContent = user ? user.username : '用户';
    document.getElementById('navHome').classList.add('active');
    document.getElementById('navProfile').classList.remove('active');

    try {
        const response = await fetch('http://localhost:3001/api/quiz/random', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        questions = data.questions;
        currentSeed = data.seed;
        correctAnswers = {};
        data.answers.forEach(a => {
            correctAnswers[a.questionId] = a.answer;
        });

        answers = {};
        hintsUsed = {};
        questions.forEach(q => {
            hintsUsed[q.questionId] = 0;
        });
        currentQuestionIndex = 0;
        renderQuestion(0);
    } catch (error) {
        showToast('获取题目失败，请确保服务器已启动');
        console.error(error);
    }
}

function switchDisplayMode(mode) {
    displayMode = mode;
    document.getElementById('singleModeBtn').style.background = mode === 'single' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0';
    document.getElementById('singleModeBtn').style.color = mode === 'single' ? 'white' : '#666';
    document.getElementById('allModeBtn').style.background = mode === 'all' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0';
    document.getElementById('allModeBtn').style.color = mode === 'all' ? 'white' : '#666';
    
    if (mode === 'all') {
        renderAllQuestions();
    } else {
        renderQuestion(currentQuestionIndex);
    }
}

function renderQuestion(index) {
    const question = questions[index];
    const progress = ((index + 1) / questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';

    let shownText = question.shownText;
    let placeholder = question.isFirstHalfShown ? '请填写下半句' : '请填写上半句';
    let questionText = question.isFirstHalfShown ?
        `${shownText}，<input type="text" class="inline-input" id="answerInput${question.questionId}"
               placeholder="${placeholder}" value="${answers[question.questionId] || ''}"
               oninput="saveAnswer(${question.questionId}, this.value)"> <button class="btn btn-nav" onclick="getHint(${question.questionId})")">提示</button>` :
        `<input type="text" class="inline-input" id="answerInput${question.questionId}"
               placeholder="${placeholder}" value="${answers[question.questionId] || ''}"
               oninput="saveAnswer(${question.questionId}, this.value)">，${shownText} <button class="btn btn-nav" onclick="getHint(${question.questionId})")">提示</button>`;

    document.getElementById('questionContainer').innerHTML = `
        <div class="question-item">
            <div class="question-header">
                <span class="question-num">第 ${question.questionId} 题</span>
                <span class="poem-info">${question.title} - ${question.author}</span>
            </div>
            <div class="question-text">${questionText}</div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            ${index > 0 ? '<button class="btn btn-nav" onclick="prevQuestion()">上一题</button>' : ''}
            ${index < questions.length - 1 ? '<button class="btn btn-nav" onclick="nextQuestion()">下一题</button>' : ''}
        </div>
    `;

    renderQuestionNav(index);
}

function renderAllQuestions() {
    const progress = 100;
    document.getElementById('progressFill').style.width = progress + '%';

    let questionsHTML = '';
    questions.forEach((question, index) => {
        let shownText = question.shownText;
        let placeholder = question.isFirstHalfShown ? '请填写下半句' : '请填写上半句';
        let questionText = question.isFirstHalfShown ?
            `${shownText}，<input type="text" class="inline-input" id="answerInput${question.questionId}"
                   placeholder="${placeholder}" value="${answers[question.questionId] || ''}"
                   oninput="saveAnswer(${question.questionId}, this.value)"> <button class="btn btn-nav" onclick="getHint(${question.questionId})")">提示</button>` :
            `<input type="text" class="inline-input" id="answerInput${question.questionId}"
                   placeholder="${placeholder}" value="${answers[question.questionId] || ''}"
                   oninput="saveAnswer(${question.questionId}, this.value)">，${shownText} <button class="btn btn-nav" onclick="getHint(${question.questionId})")">提示</button>`;

        questionsHTML += `
            <div class="question-item">
                <div class="question-header">
                    <span class="question-num">第 ${question.questionId} 题</span>
                    <span class="poem-info">${question.title} - ${question.author}</span>
                </div>
                <div class="question-text">${questionText}</div>
            </div>
        `;
    });

    

    document.getElementById('questionContainer').innerHTML = questionsHTML;
    renderQuestionNav(0); // 显示导航，但不高亮任何题目
}

function renderQuestionNav(currentIndex) {
    let navHTML = '';
    questions.forEach((q, index) => {
        const isAnswered = answers[q.questionId] !== undefined && answers[q.questionId] !== '';
        const isCurrent = index === currentIndex;
        let className = 'question-nav-item';
        if (isCurrent) className += ' current';
        if (isAnswered) className += ' answered';
        navHTML += `<div class="${className}" onclick="jumpToQuestion(${index})">${q.questionId}</div>`;
    });
    document.getElementById('questionNav').innerHTML = navHTML;
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    renderQuestion(currentQuestionIndex);
}

function saveAnswer(questionId, value) {
    answers[questionId] = value;
    updateQuestionNavStatus();
}

function updateQuestionNavStatus() {
    const navItems = document.querySelectorAll('.question-nav-item');
    navItems.forEach((item, index) => {
        const q = questions[index];
        const isAnswered = answers[q.questionId] !== undefined && answers[q.questionId] !== '';
        if (isAnswered) {
            item.classList.add('answered');
        }
    });
}

function getHint(questionId) {
    const userAnswer = answers[questionId] || '';
    const correctAnswer = correctAnswers[questionId];
    
    if (userAnswer === correctAnswer) {
        showToast('已经回答正确，不需要提示');
        return;
    }
    
    hintsUsed[questionId] = (hintsUsed[questionId] || 0) + 1;
    
    let hint = '';
    const hintLength = Math.min(hintsUsed[questionId], correctAnswer.length);
    hint = correctAnswer.substring(0, hintLength);
    
    document.getElementById(`answerInput${questionId}`).value = hint;
    answers[questionId] = hint;
    
    showToast(`提示：${hint}`);
}

let currentQuestionIndex = 0;

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion(currentQuestionIndex);
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion(currentQuestionIndex);
    }
}

async function submitQuiz() {
    const answeredIds = Object.keys(answers).filter(id => answers[id] && answers[id].trim() !== '');
    const unansweredCount = questions.length - answeredIds.length;
    
    if (unansweredCount > 0) {
        if (!confirm(`还有 ${unansweredCount} 道题未作答，确定要提交吗？`)) {
            return;
        }
    }

    const answersArray = Object.keys(answers).map(questionId => ({
        questionId: parseInt(questionId),
        userAnswer: answers[questionId]
    }));

    const totalHints = Object.values(hintsUsed).reduce((sum, count) => sum + count, 0);

    try {
        const response = await fetch('http://localhost:3001/api/quiz/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                answers: answersArray, 
                seed: currentSeed,
                hintsUsed: totalHints
            })
        });

        const result = await response.json();

        document.getElementById('quizScreen').classList.remove('active');
        document.getElementById('resultScreen').classList.add('active');
        document.getElementById('submitContainer').style.display = 'none';
        document.getElementById('totalScore').textContent = result.totalScore;

        let detailHTML = '';
        result.results.forEach(r => {
            const isCorrect = r.userAnswer.trim() === r.correctAnswer.trim();
            const question = questions.find(q => q.questionId === r.questionId);
            let questionText = '';
            if (question) {
                questionText = question.isFirstHalfShown ?
                    `${question.shownText}，______` :
                    `______，${question.shownText}`;
            }
            detailHTML += `
                <div class="result-item ${isCorrect ? 'correct' : 'wrong'}">
                    <div class="result-icon ${isCorrect ? 'correct' : 'wrong'}">
                        ${isCorrect ? '✓' : '✗'}
                    </div>
                    <div class="result-content">
                        <div class="result-question">题目：${questionText}</div>
                        <div>你的答案：<strong>${r.userAnswer || '(未填写)'}</strong></div>
                        <div class="result-answer">正确答案：<span>${r.correctAnswer}</span></div>
                    </div>
                </div>
            `;
        });
        document.getElementById('resultDetail').innerHTML = detailHTML;

    } catch (error) {
        showToast('提交失败，请确保服务器已启动');
        console.error(error);
    }
}

function restartQuiz() {
    document.getElementById('resultScreen').classList.remove('active');
    document.getElementById('quizScreen').classList.add('active');
    document.getElementById('submitContainer').style.display = 'block';
    startQuiz();
}