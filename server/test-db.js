const sqlite3 = require('sqlite3').verbose();

// 创建数据库连接
const db = new sqlite3.Database('./poetry.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    checkUsersTable();
  }
});

// 检查users表
function checkUsersTable() {
  // 检查users表结构
  db.all('PRAGMA table_info(users);', (err, rows) => {
    if (err) {
      console.error('Error getting table info:', err.message);
    } else {
      console.log('Users table structure:');
      rows.forEach(row => {
        console.log(`${row.name} (${row.type})`);
      });
    }
  });
  
  // 检查users表数据
  db.all('SELECT id, username, profile_picture FROM users;', (err, rows) => {
    if (err) {
      console.error('Error getting users:', err.message);
    } else {
      console.log('\nUsers data:');
      rows.forEach(row => {
        console.log(`User ${row.id}: ${row.username}, profile_picture: ${row.profile_picture ? 'Yes' : 'No'}`);
      });
    }
    
    // 关闭数据库
    db.close();
  });
}