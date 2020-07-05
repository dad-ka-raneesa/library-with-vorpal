const sqlite3 = require('sqlite3').verbose();
const vorpal = require('vorpal')();
const { createLibraryTables } = require('./tables');


let db = new sqlite3.Database('./step_library.db', (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

createLibraryTables(db);

const handleError = function(err) {
  if (err) throw err
};

const addNoOfBooks = function(args) {
  db.run(`Update book_titles
  set number_of_copies_total = number_of_copies_total + ${args.number_of_copies}
  where ISBN = ${args.ISBN}`, handleError)
}

const addCopies = function(args, callback) {
  const time = new Date().toJSON();
  const copiesQuery = `INSERT INTO book_copies (ISBN,is_available,enrolled_date,available_from) 
  values ('${args.ISBN}',1,'${time}', '${time}')`;
  for (let i = 0; i < args.number_of_copies; i++) {
    db.run(copiesQuery, handleError);
  }
  callback && callback();
};

const addBookToLibrary = function(args, callback) {
  const titlesQuery = `INSERT INTO book_titles values ('${args.ISBN}','${args.title}',
  '${args.author}','${args.publisher_name}','${args.book_category}','${args.number_of_copies}')`;
  db.run(titlesQuery, handleError);
  addCopies(args, callback);
};

const addCopiesToLibrary = function(args, callback, self) {
  db.all(`select * from book_titles where ISBN=${args.ISBN}`, (err, res) => {
    handleError(err);
    let message = `No book found with ISBN ${args.ISBN}\nPlease add a book`;
    let message_color = 'red';
    if (res.length) {
      addNoOfBooks(args);
      addCopies(args);
      message = `Added ${args.number_of_copies} copies for ISBN ${args.ISBN}`;
      message_color = 'green';
    }
    self.log(vorpal.chalk[message_color](message));
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
  db.all(`SELECT t2.ISBN, t2.title, t2.author, t2.publisher_name,t2.book_category,t2.number_of_copies_total,count(*) as available_copies
  FROM book_copies t1 left join book_titles t2 on t1.ISBN=t2.ISBN where t1.is_available=1 group by t2.ISBN`, (err, table) => {
    handleError(err);
    const books = filterBooksByOptions(table, args.options);
    console.log("");
    console.table(books);
    this.log();
    callback();
  });
};

const displayBooks = function(args, callback) {
  db.all(`SELECT * FROM book_titles`, (err, table) => {
    handleError(err);
    console.log("");
    console.table(table);
    this.log();
    callback();
  });
};

vorpal
  .command('add-book')
  .description('Add a book into library')
  .action(function(args, callback) {
    this.prompt([{
      type: 'input',
      name: 'ISBN',
      message: 'Enter ISBN number : '
    }, {
      type: 'input',
      name: 'title',
      message: 'Enter title : '
    },
    {
      type: 'input',
      name: 'author',
      message: 'Enter author name : '
    }, {
      type: 'input',
      name: 'publisher_name',
      message: 'Enter publisher : '
    }, {
      type: 'input',
      name: 'book_category',
      message: 'Enter book category : '
    }, {
      type: 'input',
      name: 'number_of_copies',
      message: 'Enter number of copies : '
    }
    ], (res) => addBookToLibrary(res, callback))
  });

vorpal
  .command('add-copies')
  .description('Adds additions copies when book is exists')
  .action(function(args, callback) {
    const self = this;
    this.prompt([
      {
        type: 'input',
        name: 'ISBN',
        message: 'Enter ISBN : '
      }, {
        type: 'input',
        name: 'number_of_copies',
        message: 'Enter number of copies : '
      }], (args) => addCopiesToLibrary(args, callback, self));
  })

vorpal
  .command('books', 'displays all the books')
  .action(displayBooks);

vorpal
  .command('available-books', 'displays all the available books')
  .option('-i,--ISBN <ISBN>', "display's all the books with given ISBN")
  .option('-a,--author <author>', "display's all the books with given author")
  .option('-t,--title <title>', "display's all the books with given title")
  .option(
    '-c,--book_category <book_category>',
    "display's all the books with given category"
  )
  .option(
    '-p,--publisher_name <publisher_name>',
    "display's all the books with given publisher"
  )
  .action(displayAvailableBooks);

vorpal.command('register-user <username>')
  .description("Register's given user into library")
  .action(function(args, callback) {
    if (!args.username) {
      this.log(vorpal.chalk.red('Please Provide name'));
      callback();
    }
    db.all(`select * from library_users`, (err, res) => {
      handleError(err);
      const new_id = `USR_${res.length + 1}`;
      db.run(`INSERT INTO library_users (user_name,library_user_id) values("${args.username}","${new_id}")`, handleError);
      this.log(vorpal.chalk.green(`Successfully Registered.\nYour user_id is ${new_id}`));
      callback();
    })
  })

vorpal.command('users').description("Gives library users list.").action(function(args, callback) {
  db.all(`select * from library_users`, (err, res) => {
    handleError(err);
    console.log("");
    console.table(res);
    this.log();
    callback();
  })
})

vorpal
  .command('clear', 'clear the screen')
  .action(function(args, callback) {
    console.clear();
    this.log();
    callback();
  })

vorpal
  .command('exit', 'exit')
  .action(() => {
    db.close((err) => {
      if (err) return console.error(err.message);
    });
    process.exit(0);
  })

vorpal
  .delimiter('Step-Library $ ')
  .show();