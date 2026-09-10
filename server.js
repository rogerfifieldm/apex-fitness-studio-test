const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'apex.db');
const db = new sqlite3.Database(dbPath);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    day TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    instructor TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    spots_left INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(class_id) REFERENCES classes(id)
  )`);

  db.get('SELECT COUNT(*) AS count FROM classes', (err, row) => {
    if (err) throw err;
    if (row.count === 0) {
      const seed = [
        [1,'Power Foundations','Strength','Monday','Sep 14','6:00 AM','Maya Thompson',8,8],
        [2,'HIIT Express','Cardio','Monday','Sep 14','5:30 PM','Jordan Lee',5,5],
        [3,'Strength Circuit','Strength','Tuesday','Sep 15','6:30 PM','Chris Walker',10,10],
        [4,'Yoga Flow','Mind & Body','Wednesday','Sep 16','7:00 AM','Elena Cruz',12,12],
        [5,'Cardio Burn','Cardio','Thursday','Sep 17','5:45 PM','Jordan Lee',6,6],
        [6,'Mobility Reset','Mind & Body','Friday','Sep 18','12:00 PM','Elena Cruz',14,14],
        [7,'Total Body Strength','Strength','Saturday','Sep 19','9:00 AM','Chris Walker',7,7],
        [8,'Weekend Sweat','Cardio','Saturday','Sep 19','10:30 AM','Maya Thompson',9,9]
      ];
      const stmt = db.prepare(`INSERT INTO classes (id,name,category,day,date,time,instructor,capacity,spots_left) VALUES (?,?,?,?,?,?,?,?,?)`);
      seed.forEach(r => stmt.run(r));
      stmt.finalize();
    }
  });
});

app.get('/api/classes', (req, res) => {
  db.all('SELECT * FROM classes ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Could not load classes.' });
    res.json(rows);
  });
});

app.post('/api/reservations', (req, res) => {
  const { classId, name, email } = req.body;
  if (!classId || !name || !email) return res.status(400).json({ error: 'Name, email, and class are required.' });
  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail)) return res.status(400).json({ error: 'Please enter a valid name and email.' });

  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION');
    db.get('SELECT * FROM classes WHERE id = ?', [classId], (err, cls) => {
      if (err || !cls) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Class not found.' });
      }
      if (cls.spots_left <= 0) {
        db.run('ROLLBACK');
        return res.status(409).json({ error: 'This class is full.' });
      }

      db.get('SELECT id FROM reservations WHERE class_id = ? AND email = ?', [classId, cleanEmail], (dupErr, dup) => {
        if (dupErr) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Could not check reservation.' });
        }
        if (dup) {
          db.run('ROLLBACK');
          return res.status(409).json({ error: 'This email is already registered for this class.' });
        }

        db.run('UPDATE classes SET spots_left = spots_left - 1 WHERE id = ? AND spots_left > 0', [classId], function(updateErr) {
          if (updateErr || this.changes !== 1) {
            db.run('ROLLBACK');
            return res.status(409).json({ error: 'This class just filled up. Please choose another.' });
          }

          db.run('INSERT INTO reservations (class_id, name, email) VALUES (?, ?, ?)', [classId, cleanName, cleanEmail], function(insertErr) {
            if (insertErr) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Could not save reservation.' });
            }
            const reservationId = this.lastID;
            db.run('COMMIT', commitErr => {
              if (commitErr) return res.status(500).json({ error: 'Could not finalize reservation.' });
              db.get('SELECT spots_left FROM classes WHERE id = ?', [classId], (spotsErr, updated) => {
                if (spotsErr) return res.status(500).json({ error: 'Reservation saved, but capacity refresh failed.' });
                res.status(201).json({ id: reservationId, spotsLeft: updated.spots_left });
              });
            });
          });
        });
      });
    });
  });
});

app.get('/api/admin/reservations', (req, res) => {
  const sql = `SELECT r.id, r.name, r.email, r.created_at, c.id AS class_id, c.name AS class_name,
               c.day, c.date, c.time, c.instructor
               FROM reservations r JOIN classes c ON c.id = r.class_id
               ORDER BY c.id, r.created_at`;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Could not load reservations.' });
    res.json(rows);
  });
});

app.listen(PORT, () => console.log(`Apex Fitness V2 running on http://localhost:${PORT}`));
