const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');

const app = express();
const port = 3001;
const secretKey = 'your-secret-key';
const LEADERBOARD_LIMIT = 20; //排行榜最大数量

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问被拒绝' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的令牌' });
    }
    req.user = user;
    next();
  });
}

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问被拒绝' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的令牌' });
    }
    req.user = user;

    db.get('SELECT is_admin FROM users WHERE id = ?', [user.userId], (err, row) => {
      if (err || !row || !row.is_admin) {
        return res.status(403).json({ error: '需要管理员权限' });
      }
      next();
    });
  });
}

const db = new sqlite3.Database('./poetry.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码是必需的' });
  }

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
    if (err) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    res.json({ message: '用户注册成功', userId: this.lastID });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码是必需的' });
  }

  db.get('SELECT id, username, is_admin FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!row) {
      return res.status(401).json({ error: '无效的凭据' });
    }

    const token = jwt.sign({ userId: row.id, username: row.username, is_admin: row.is_admin }, secretKey, { expiresIn: '24h' });
    res.json({ token, user: { id: row.id, username: row.username, is_admin: row.is_admin } });
  });
});

app.get('/api/auth/user', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.get('SELECT id, username, profile_picture, is_admin FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!row) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ user: row });
  });
});

app.post('/api/auth/profile-picture', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { profile_picture } = req.body;

  console.log('Updating profile picture for user:', userId);
  console.log('Profile picture length:', profile_picture ? profile_picture.length : 0);

  if (!profile_picture) {
    return res.status(400).json({ error: '头像图片是必需的' });
  }

  db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [profile_picture, userId], function(err) {
    if (err) {
      console.error('Error updating profile picture:', err);
      return res.status(500).json({ error: '更新头像失败' });
    }
    console.log('Profile picture updated successfully for user:', userId);
    res.json({ message: '头像更新成功', profile_picture });
  });
});

app.put('/api/auth/update', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: '用户名是必需的' });
  }

  let sql = 'UPDATE users SET username = ?';
  let params = [username];

  if (password) {
    sql += ', password = ?';
    params.push(password);
  }

  sql += ' WHERE id = ?';
  params.push(userId);

  db.run(sql, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '用户名已存在' });
      }
      return res.status(500).json({ error: '更新失败' });
    }

    const token = jwt.sign({ userId: userId, username: username }, secretKey, { expiresIn: '24h' });
    res.json({ message: '更新成功', token, user: { id: userId, username: username } });
  });
});

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  db.all('SELECT id, username, is_admin, profile_picture, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    res.json({ users: rows });
  });
});

app.put('/api/admin/users/:id', authenticateAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { username, password, is_admin } = req.body;

  if (!username) {
    return res.status(400).json({ error: '用户名是必需的' });
  }

  let sql = 'UPDATE users SET username = ?';
  let params = [username];

  if (password) {
    sql += ', password = ?';
    params.push(password);
  }

  if (is_admin !== undefined) {
    sql += ', is_admin = ?';
    params.push(is_admin ? 1 : 0);
  }

  sql += ' WHERE id = ?';
  params.push(userId);

  db.run(sql, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '用户名已存在' });
      }
      return res.status(500).json({ error: '更新失败' });
    }
    res.json({ message: '用户更新成功' });
  });
});

app.delete('/api/admin/users/:id', authenticateAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  if (userId === 1) {
    return res.status(400).json({ error: '不能删除超级管理员' });
  }

  db.run('DELETE FROM speech_comments WHERE user_id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting speech_comments:', err.message);
    }
  });

  db.run('DELETE FROM speech_dislikes WHERE user_id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting speech_dislikes:', err.message);
    }
  });

  db.run('DELETE FROM speech_likes WHERE user_id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting speech_likes:', err.message);
    }
  });

  db.run('DELETE FROM victory_speeches WHERE user_id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting victory_speeches:', err.message);
    }
  });

  db.run('DELETE FROM scores WHERE user_id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting scores:', err.message);
    }
  });

  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: '删除用户失败' });
    }
    res.json({ message: '用户删除成功' });
  });
});

app.get('/api/poems', (req, res) => {
  db.all('SELECT id, title, author FROM poems', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      count: rows.length,
      poems: rows
    });
  });
});

app.get('/api/poems/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM poems WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: '古诗未找到' });
      return;
    }
    row.sentenceList = JSON.parse(row.sentenceList);
    row.sentenceTranslations = JSON.parse(row.sentenceTranslations);
    res.json(row);
  });
});

app.listen(port, () => {
  console.log(`服务运行端口 ${port}`);
});

app.get('/api/quiz/random', authenticateToken, (req, res) => {
  db.all('SELECT id, title, author, sentenceList FROM poems', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (rows.length === 0) {
      res.status(404).json({ error: '未找到古诗' });
      return;
    }

    const allSentences = [];

    rows.forEach(poem => {
      const sentenceList = JSON.parse(poem.sentenceList);
      sentenceList.forEach((sentence, index) => {
        if (index % 2 === 0 && index + 1 < sentenceList.length) {
          allSentences.push({
            poemId: poem.id,
            title: poem.title,
            author: poem.author,
            firstHalf: sentence,
            secondHalf: sentenceList[index + 1]
          });
        }
      });
    });

    if (allSentences.length < 10) {
      res.status(500).json({ error: '生成测验的句子不足' });
      return;
    }

    const baseSeed = Date.now() % 1000000;
    const quizQuestions = [];

    for (let i = 0; i < 10; i++) {
      const seed = baseSeed + i * 123;
      const randomIndex = seed % allSentences.length;
      const question = allSentences[randomIndex];
      const isFirstHalfShown = (seed % 2) === 0;

      quizQuestions.push({
        questionId: i + 1,
        poemId: question.poemId,
        title: question.title,
        author: question.author,
        shownText: isFirstHalfShown ? question.firstHalf : question.secondHalf,
        isFirstHalfShown: isFirstHalfShown,
        answer: isFirstHalfShown ? question.secondHalf : question.firstHalf
      });
    }

    const responseQuestions = quizQuestions.map(q => ({
      questionId: q.questionId,
      poemId: q.poemId,
      title: q.title,
      author: q.author,
      shownText: q.shownText,
      isFirstHalfShown: q.isFirstHalfShown
    }));

    global.quizSeed = baseSeed;

    res.json({
      questions: responseQuestions,
      seed: baseSeed,
      answers: quizQuestions.map(q => ({
        questionId: q.questionId,
        answer: q.answer
      }))
    });
  });
});

app.post('/api/quiz/submit', authenticateToken, (req, res) => {
  const { answers, seed, hintsUsed = 0 } = req.body;
  const userId = req.user.userId;

  if (!answers || !Array.isArray(answers)) {
    res.status(400).json({ error: '无效的答案格式' });
    return;
  }

  db.all('SELECT id, title, author, sentenceList FROM poems', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const allSentences = [];
    rows.forEach(poem => {
      const sentenceList = JSON.parse(poem.sentenceList);
      sentenceList.forEach((sentence, index) => {
        if (index % 2 === 0 && index + 1 < sentenceList.length) {
          allSentences.push({
            poemId: poem.id,
            title: poem.title,
            author: poem.author,
            firstHalf: sentence,
            secondHalf: sentenceList[index + 1]
          });
        }
      });
    });

    const baseSeed = seed || global.quizSeed || Date.now() % 1000000;
    const quizQuestions = [];

    for (let i = 0; i < 10; i++) {
      const questionSeed = baseSeed + i * 123;
      const randomIndex = questionSeed % allSentences.length;
      const question = allSentences[randomIndex];
      const isFirstHalfShown = (questionSeed % 2) === 0;

      quizQuestions.push({
        questionId: i + 1,
        poemId: question.poemId,
        title: question.title,
        author: question.author,
        shownText: isFirstHalfShown ? question.firstHalf : question.secondHalf,
        isFirstHalfShown: isFirstHalfShown,
        answer: isFirstHalfShown ? question.secondHalf : question.firstHalf
      });
    }

    let totalScore = 0;
    const results = quizQuestions.map(question => {
      const answerItem = answers.find(a => a.questionId === question.questionId);
      const userAnswer = answerItem ? answerItem.userAnswer : '';
      const correctAnswer = question.answer;
      const isCorrect = userAnswer && userAnswer.trim() === correctAnswer.trim();

      if (isCorrect) {
        totalScore += 10;
      }

      return {
        questionId: question.questionId,
        userAnswer: userAnswer || '',
        correctAnswer,
        isCorrect,
        score: isCorrect ? 10 : 0
      };
    });

    db.run('INSERT INTO scores (user_id, score, hints_used) VALUES (?, ?, ?)', [userId, totalScore, hintsUsed], function(err) {
      if (err) {
        console.error('Error saving score:', err.message);
      }

      res.json({
        totalScore,
        totalQuestions: answers.length,
        correctCount: results.filter(r => r.isCorrect).length,
        results
      });
    });
  });
});

app.get('/api/quiz/leaderboard', (req, res) => {
  db.all(`
    SELECT users.id as user_id, users.username, users.profile_picture, s.score as highest_score, s.hints_used
    FROM (
      SELECT user_id, MAX(score) as max_score
      FROM scores
      GROUP BY user_id
    ) as max_scores
    JOIN scores as s ON max_scores.user_id = s.user_id AND max_scores.max_score = s.score
    JOIN users ON s.user_id = users.id
    ORDER BY highest_score DESC, s.hints_used ASC
    LIMIT ${LEADERBOARD_LIMIT}
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({
      leaderboard: rows
    });
  });
});

app.post('/api/leaderboard/speech', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: '内容是必需的' });
  }

  db.run('INSERT INTO victory_speeches (user_id, content) VALUES (?, ?)', [userId, content], function(err) {
    if (err) {
      return res.status(500).json({ error: '发表个性签名失败' });
    }
    res.json({ message: '个性签名发表成功' });
  });
});

app.get('/api/leaderboard/speeches', (req, res) => {
  const userId = req.query.user_id;

  if (userId) {
    let sql = `
      SELECT vs.id, vs.user_id, users.username, vs.content, vs.created_at,
             (SELECT COUNT(*) FROM speech_likes WHERE speech_id = vs.id) as like_count,
             (SELECT COUNT(*) FROM speech_dislikes WHERE speech_id = vs.id) as dislike_count
      FROM victory_speeches as vs
      JOIN users ON vs.user_id = users.id
      WHERE vs.user_id = ?
      ORDER BY vs.created_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        speeches: rows
      });
    });
  } else {
    let sql = `
      SELECT vs.id, vs.user_id, users.username, vs.content, vs.created_at,
             (SELECT COUNT(*) FROM speech_likes WHERE speech_id = vs.id) as like_count,
             (SELECT COUNT(*) FROM speech_dislikes WHERE speech_id = vs.id) as dislike_count
      FROM victory_speeches as vs
      JOIN users ON vs.user_id = users.id
      WHERE vs.user_id IN (
        SELECT user_id FROM (
          SELECT user_id, MAX(score) as max_score
          FROM scores
          GROUP BY user_id
          ORDER BY max_score DESC
          LIMIT ${LEADERBOARD_LIMIT}
        ) as leaderboard_users
      )
      ORDER BY vs.created_at DESC
      LIMIT 50
    `;
    db.all(sql, [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        speeches: rows
      });
    });
  }
});

app.get('/api/leaderboard/speeches/:id/comments', (req, res) => {
  const speechId = req.params.id;

  db.all(`
    SELECT sc.id, sc.user_id, users.username, sc.content, sc.created_at
    FROM speech_comments as sc
    JOIN users ON sc.user_id = users.id
    WHERE sc.speech_id = ?
    ORDER BY sc.created_at DESC
  `, [speechId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      comments: rows
    });
  });
});

app.post('/api/leaderboard/speeches/:id/like', authenticateToken, (req, res) => {
  const speechId = req.params.id;
  const userId = req.user.userId;

  const today = new Date().toISOString().split('T')[0];
  db.get(`
    SELECT id FROM speech_likes
    WHERE speech_id = ? AND user_id = ?
    AND DATE(created_at) = ?
  `, [speechId, userId, today], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(400).json({ error: '今天已经点赞过了' });
    }

    db.run('INSERT INTO speech_likes (speech_id, user_id) VALUES (?, ?)', [speechId, userId], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: '已经点赞过了' });
        }
        return res.status(500).json({ error: '点赞失败' });
      }
      res.json({ message: '点赞成功' });
    });
  });
});

app.post('/api/leaderboard/speeches/:id/dislike', authenticateToken, (req, res) => {
  const speechId = req.params.id;
  const userId = req.user.userId;

  const today = new Date().toISOString().split('T')[0];
  db.get(`
    SELECT id FROM speech_dislikes
    WHERE speech_id = ? AND user_id = ?
    AND DATE(created_at) = ?
  `, [speechId, userId, today], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(400).json({ error: '今天已经踩过了' });
    }

    db.run('INSERT INTO speech_dislikes (speech_id, user_id) VALUES (?, ?)', [speechId, userId], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: '已经踩过了' });
        }
        return res.status(500).json({ error: '踩失败' });
      }
      res.json({ message: '踩成功' });
    });
  });
});

app.post('/api/leaderboard/speeches/:id/comment', authenticateToken, (req, res) => {
  const speechId = req.params.id;
  const userId = req.user.userId;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  db.run('INSERT INTO speech_comments (speech_id, user_id, content) VALUES (?, ?, ?)', [speechId, userId, content], function(err) {
    if (err) {
      return res.status(500).json({ error: '评论失败' });
    }
    res.json({ message: '评论成功' });
  });
});

app.get('/api/quiz/history', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.all(`
    SELECT score, hints_used, created_at
    FROM scores
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `, [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      history: rows
    });
  });
});