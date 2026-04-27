const sqlite3 = require('sqlite3').verbose();

// 创建数据库连接
const db = new sqlite3.Database('./poetry.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    clearUserData();
  }
});

// 清除用户相关数据
function clearUserData() {
  // 开始事务
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error('Error starting transaction:', err.message);
      db.close();
      return;
    }

    // 按顺序删除相关表数据（外键约束）
    const tables = [
      'speech_comments',
      'speech_dislikes',
      'speech_likes',
      'victory_speeches',
      'scores',
      'users'
    ];

    let index = 0;

    function deleteNextTable() {
      if (index >= tables.length) {
        // 提交事务
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err.message);
          } else {
            console.log('All user data deleted successfully.');
          }
          db.close();
        });
        return;
      }

      const table = tables[index];
      db.run(`DELETE FROM ${table}`, (err) => {
        if (err) {
          console.error(`Error deleting from ${table}:`, err.message);
          db.run('ROLLBACK', () => {
            db.close();
          });
        } else {
          console.log(`Deleted all data from ${table}`);
          index++;
          deleteNextTable();
        }
      });
    }

    deleteNextTable();
  });
}