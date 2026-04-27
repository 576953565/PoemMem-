const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// 创建数据库连接
const db = new sqlite3.Database('./poetry.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

// 创建用户表和分数表
function createTables() {
  // 创建用户表（如果不存在）
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      profile_picture TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created successfully.');
    }
  });

  // 为已有表添加is_admin列（如果不存在）
  db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('is_admin column already exists.');
      } else {
        console.error('Error adding is_admin column:', err.message);
      }
    } else {
      console.log('is_admin column added successfully.');
    }
  });

  // 创建分数表
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      score INTEGER,
      hints_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating scores table:', err.message);
    } else {
      console.log('Scores table created successfully.');
    }
  });

  // 为已有表添加hints_used列（如果不存在）
  db.run(`ALTER TABLE scores ADD COLUMN hints_used INTEGER DEFAULT 0`, (err) => {
    if (err) {
      // 如果列已经存在，忽略错误
      if (err.message.includes('duplicate column name')) {
        console.log('hints_used column already exists.');
      } else {
        console.error('Error adding hints_used column:', err.message);
      }
    } else {
      console.log('hints_used column added successfully.');
    }
  });

  // 创建个性签名表
  db.run(`
    CREATE TABLE IF NOT EXISTS victory_speeches (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating victory_speeches table:', err.message);
    } else {
      console.log('个性签名表 created successfully.');
    }
  });

  // 创建点赞表
  db.run(`
    CREATE TABLE IF NOT EXISTS speech_likes (
      id INTEGER PRIMARY KEY,
      speech_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(speech_id, user_id),
      FOREIGN KEY (speech_id) REFERENCES victory_speeches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating speech_likes table:', err.message);
    } else {
      console.log('点赞表 created successfully.');
    }
  });

  // 创建踩表
  db.run(`
    CREATE TABLE IF NOT EXISTS speech_dislikes (
      id INTEGER PRIMARY KEY,
      speech_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(speech_id, user_id),
      FOREIGN KEY (speech_id) REFERENCES victory_speeches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating speech_dislikes table:', err.message);
    } else {
      console.log('踩表 created successfully.');
    }
  });

  // 创建评论表
  db.run(`
    CREATE TABLE IF NOT EXISTS speech_comments (
      id INTEGER PRIMARY KEY,
      speech_id INTEGER,
      user_id INTEGER,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (speech_id) REFERENCES victory_speeches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating speech_comments table:', err.message);
    } else {
      console.log('评论表 created successfully.');
    }
  });

  // 创建admin超级管理员账号（如果不存在）
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err.message);
    } else if (!row) {
      db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', ['admin', '578328fm', 1], (err) => {
        if (err) {
          console.error('Error creating admin user:', err.message);
        } else {
          console.log('Admin user created successfully.');
        }
      });
    } else {
      console.log('Admin user already exists.');
    }
  });

  // 关闭数据库
  setTimeout(() => {
    db.close();
    console.log('Database closed.');
  }, 1000);
}