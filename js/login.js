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

// 页面加载时检查登录状态
window.onload = function() {
    if (token) {
        window.location.href = 'index.html';
    }
};

function switchAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.querySelectorAll('.auth-tab')[1].classList.remove('active');
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.querySelectorAll('.auth-tab')[0].classList.remove('active');
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
    }
}

async function register() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    if (!username || !password) {
        showToast('请输入用户名和密码');
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.error) {
            showToast(data.error);
        } else {
            showToast('注册成功，请登录');
            switchAuthTab('login');
        }
    } catch (error) {
        showToast('注册失败，请确保服务器已启动');
        console.error(error);
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showToast('请输入用户名和密码');
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.error) {
            showToast(data.error);
        } else {
            token = data.token;
            user = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            window.location.href = 'index.html';
        }
    } catch (error) {
        showToast('登录失败，请确保服务器已启动');
        console.error(error);
    }
}