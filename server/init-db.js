const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// 读取古诗数据
const poemsData = JSON.parse(fs.readFileSync('../data.json', 'utf8'));

// 创建数据库连接
const db = new sqlite3.Database('./poetry.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTable();
  }
});

// 创建poems表
function createTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY,
      category TEXT,
      title TEXT,
      author TEXT,
      fullText TEXT,
      sentenceList TEXT,
      sentenceTranslations TEXT,
      keySentence TEXT,
      pinyin TEXT,
      errorWords TEXT,
      remark TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Table created successfully.');
      insertData();
    }
  });
}

// 导入数据
function insertData() {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO poems 
    (id, category, title, author, fullText, sentenceList, sentenceTranslations, keySentence, pinyin, errorWords, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  poemsData.forEach(poem => {
    stmt.run(
      poem.id,
      poem.category,
      poem.title,
      poem.author,
      poem.fullText,
      JSON.stringify(poem.sentenceList),
      JSON.stringify(poem.sentenceTranslations),
      poem.keySentence,
      poem.pinyin,
      poem.errorWords,
      poem.remark,
      (err) => {
        if (err) {
          console.error('Error inserting poem:', err.message);
        }
      }
    );
  });

  stmt.finalize((err) => {
    if (err) {
      console.error('Error finalizing statement:', err.message);
    } else {
      console.log('Data inserted successfully.');
      db.close();
      console.log('Database closed.');
    }
  });
}
