const sqlite3 = require('sqlite3').verbose();
const vorpal = require('vorpal')();
const { createLibraryTables } = require('./tables');

const handleError = function(err) {
  if (err) throw (err.message);
};

let db = new sqlite3.Database('./step_library.db', handleError);
createLibraryTables(db);

const closeDb = function() {
  db.close((err) => {
    if (err) return console.error(err.message);
  });
  process.exit(0);
}

const addCopies = function(args) {
  const time = new Date().toJSON();
  const copiesQuery = `INSERT INTO book_copies (ISBN,is_available,enrolled_date,available_from) 
  VALUES ('${args.ISBN}',1,'${time}', '${time}')`;
  for (let i = 0; i < args.number_of_copies; i++) {
    db.run(copiesQuery, handleError);
  }
  db.run(`UPDATE book_titles
  SET number_of_copies_total = number_of_copies_total + ${args.number_of_copies}
  WHERE ISBN = ${args.ISBN}`, handleError);
};

const addBookToLibrary = function(self, args, callback) {
  const titlesQuery = `INSERT INTO book_titles VALUES ('${args.ISBN}','${args.title}',
  '${args.author}','${args.publisher_name}','${args.book_category}',0)`;
  db.run(titlesQuery, (err) => {
    handleError(err);
    addCopies(args);
    self.log(`Added book successfully with ${args.ISBN}`);
    callback();
  });
};

const isValidBook = function(ISBN) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM book_titles WHERE ISBN=${ISBN}`, (err, res) => {
      handleError(err);
      if (res.length) resolve('Valid Book')
      else reject('Invalid Book')
    })
  });
};

const addCopiesToLibrary = function(self, args, callback) {
  isValidBook(args.ISBN).then(res => {
    addCopies(args);
    self.log(vorpal.chalk.green(`Added ${args.number_of_copies} copies for ISBN ${args.ISBN}`));
    callback();
  }).catch(err => {
    self.log(vorpal.chalk.red(`No book found with ISBN ${args.ISBN}\nPlease add book`));
    callback();
  })
};

const filterBooksByOptions = (books, options) => {
  for (const option in options) {
    books = books.filter(book => book[option] == options[option]);
  }
  return books;
};

const displayAvailableBooks = function(args, callback) {
  db.all(`SELECT t2.ISBN, t2.title, t2.author, t2.publisher_name,t2.book_category,t2.number_of_copies_total,count(*) AS available_copies
  FROM book_copies t1 LEFT JOIN book_titles t2 ON t1.ISBN=t2.ISBN WHERE t1.is_available=1 GROUP BY t2.ISBN`, (err, table) => {
    handleError(err);
    const books = filterBooksByOptions(table, args.options);
    console.log("");
    console.table(books);
    this.log();
    callback();
  });
};

const displayTable = function(self, table_name, callback) {
  db.all(`SELECT * FROM ${table_name}`, (err, table) => {
    handleError(err);
    console.log("");
    console.table(table);
    self.log();
    callback();
  });
};

const issueBookFromLibrary = function(self, book, userId, callback) {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION', handleError);

    db.run(`INSERT INTO library_log( action, date_of_action, library_user_id, serial_number ) VALUES ("issue",datetime('now'), '${userId}', '${book.serial_number}');`, handleError);

    db.run(`UPDATE book_copies SET is_available = 0, issued_date = datetime('now'), available_from = datetime('now', '+15 days'), library_user_id = "${userId}" WHERE serial_number = "${book.serial_number}";`, handleError);

    db.run('END TRANSACTION', (err) => {
      handleError(err);
      self.log(vorpal.chalk.green(`Issued successfully\nBook Details : \nISBN : ${book.ISBN}\nserial_number : ${book.serial_number}`));
      callback();
    });
  });
}

const returnBookToLibrary = function(self, serial_number, userId, callback) {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION', handleError);

    db.run(`INSERT INTO library_log( action, date_of_action, library_user_id, serial_number ) VALUES ("return",datetime('now'), '${userId}', '${serial_number}');`, handleError);

    db.run(`UPDATE book_copies SET is_available = 1, issued_date = null, available_from = datetime('now'), library_user_id = null WHERE serial_number = "${serial_number}";`, handleError);

    db.run('END TRANSACTION', (err) => {
      handleError(err);
      self.log(vorpal.chalk.green(`Returned book with ${serial_number} serial_number`));
      callback();
    });
  });
}

const registerUser = function(self, username, callback) {
  db.all(`SELECT * FROM library_users`, (err, res) => {
    handleError(err);
    const new_id = `USR_${res.length + 1}`;
    db.run(`INSERT INTO library_users (user_name,library_user_id) VALUES("${username}","${new_id}")`, (err) => {
      handleError(err);
      self.log(vorpal.chalk.green(`Successfully Registered.\nYour user_id is ${new_id}`));
      callback();
    });
  })
}

const isValidUser = function(userId) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM library_users WHERE library_user_id="${userId}"`, (err, res) => {
      handleError(err);
      if (res.length) resolve(res);
      else reject('no user with this ')
    })
  })
};

const isBookAvailable = function(ISBN) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM book_copies WHERE ISBN = ${ISBN} AND is_available=1`, (err, availableBooks) => {
      handleError(err);
      if (availableBooks.length) resolve(availableBooks.shift());
      else reject('no book found');
    });
  })
};

const issueBook = function(self, ISBN, userId, callback) {
  isValidUser(userId).then(res => {
    isBookAvailable(ISBN).then(book => issueBookFromLibrary(self, book, userId, callback))
      .catch(err => {
        self.log(vorpal.chalk.red('The book is not available'));
        callback();
      })
  }).catch(err => {
    self.log(vorpal.chalk.red('Invalid user id.\nPlease Enter valid user id'));
    callback();
  })
}

const isAnIssuedBook = function(userId, serial_number) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM library_log WHERE serial_number =" ${serial_number}" AND library_user_id="${userId}"`, (err, [issuedBook]) => {
      handleError(err);
      if (issuedBook) resolve(issuedBook);
      else reject('no an issued book');
    });
  })
};

const returnBook = function(self, userId, serial_number, callback) {
  isValidUser(userId).then(res => {
    isAnIssuedBook(userId, serial_number).then(issuedBook => returnBookToLibrary(self, issuedBook.serial_number, userId, callback))
      .catch(err => {
        self.log(vorpal.chalk.red('You cannot return this book'));
        callback();
      })
  }).catch(err => {
    self.log(vorpal.chalk.red('Invalid user id.\nPlease Enter valid user id'));
    callback();
  })
}

const displayUserLogs = function(self, userId, callback) {
  isValidUser(userId).then(res => {
    db.all(`SELECT 
    CASE 
    WHEN t1.action ='issue' THEN 'Borrowed' 
    ELSE 'Returned' END AS action,
    t2.ISBN,
    t1.serial_number,
    t1.date_of_action
    FROM library_log t1 LEFT JOIN book_copies t2 ON t1.serial_number=t2.serial_number
    WHERE t1.library_user_id="${userId}"`, (err, res) => {
      handleError(err);
      console.log("");
      console.table(res);
      self.log();
      callback();
    })
  }).catch(err => {
    self.log(vorpal.chalk.red('Invalid user id.\nPlease Enter valid user id'));
    callback();
  })
};

module.exports = {
  addBookToLibrary,
  addCopiesToLibrary,
  displayTable,
  displayAvailableBooks,
  registerUser,
  issueBook,
  returnBook,
  closeDb,
  displayUserLogs
}