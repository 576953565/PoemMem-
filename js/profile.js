let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user'));

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
    window.location.href = 'index.html';
}

function goToMember() {
    window.location.href = 'member.html';
}

window.onload = function() {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('navUserName').textContent = user.username;

    if (user && user.is_admin) {
        document.getElementById('navMember').style.display = 'inline-block';
        document.getElementById('menuMember').style.display = 'block';
    }

    loadHistoryScores();
    loadHistoryScoresList();
};

async function updateProfile() {
    const newUsername = document.getElementById('profileUsername').value.trim();
    const newPassword = document.getElementById('profilePassword').value;
    const confirmPassword = document.getElementById('profilePasswordConfirm').value;

    if (!newUsername) {
        showToast('请输入用户名');
        return;
    }

    if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
            showToast('两次输入的密码不一致');
            return;
        }
        if (newPassword.length < 6) {
            showToast('密码长度至少为6位');
            return;
        }
    }

    try {
        const response = await fetch('http://localhost:3001/api/auth/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username: newUsername,
                password: newPassword || undefined
            })
        });

        const data = await response.json();
        if (data.error) {
            showToast(data.error);
        } else {
            user.username = newUsername;
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('navUserName').textContent = newUsername;
            showToast('修改成功');
            document.getElementById('profileUsername').value = '';
            document.getElementById('profilePassword').value = '';
            document.getElementById('profilePasswordConfirm').value = '';
        }
    } catch (error) {
        showToast('修改失败，请确保服务器已启动');
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

        if (!data.history || data.history.length === 0) {
            document.getElementById('scoreChart').parentElement.innerHTML =
                '<div style="text-align: center; color: #666; padding: 50px;">暂无历史分数数据</div>';
            return;
        }

        const scores = data.history.map(item => item.score);
        const dates = data.history.map(item => {
            const date = new Date(item.created_at);
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
                const date = new Date(item.created_at);
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

function goToStart() {
    window.location.href = 'index.html';
}
