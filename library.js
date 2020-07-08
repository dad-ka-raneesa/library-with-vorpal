const vorpal = require('vorpal')();
const {
  addBookToLibrary,
  addCopiesToLibrary,
  displayTable,
  displayAvailableBooks,
  registerUser,
  issueBook,
  returnBook,
  closeDb,
  displayUserLogs
} = require('./handlers');

const attachCommands = function() {
  vorpal
    .command('add-book')
    .description('Adds book into the library')
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
      ], (res) => {
        const self = this;
        addBookToLibrary(self, res, callback)
      })
    });

  vorpal
    .command('add-copies')
    .description('Adds additional copies of an existing book in the library')
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
        }], (args) => addCopiesToLibrary(self, args, callback));
    })

  vorpal
    .command('books', 'displays all the books')
    .action(function(args, callback) {
      const self = this;
      displayTable(self, 'book_titles', callback);
    });

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
    .description("Registers the given user into the library")
    .action(function(args, callback) {
      const self = this;
      registerUser(self, args.username, callback);
    })

  vorpal.command('users')
    .description("Gives all the users of the library")
    .action(function(args, callback) {
      const self = this;
      displayTable(self, 'library_users', callback);
    })

  vorpal
    .command('issue-book <ISBN> <userId>', 'Issues a book from the library')
    .action(function(args, callback) {
      const self = this;
      issueBook(self, args.ISBN, args.userId, callback);
    })

  vorpal
    .command('return-book <serial_number> <userId>', 'Returns a book to the library')
    .action(function(args, callback) {
      const self = this;
      returnBook(self, args.userId, args.serial_number, callback);
    })

  vorpal
    .command('user-logs <userId>', 'Displays a particular user\'s log')
    .action(function(args, callback) {
      const self = this;
      displayUserLogs(self, args.userId, callback);
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
    .action(closeDb)
}

const main = function() {
  const exit = vorpal.find('exit');
  if (exit) exit.remove();
  vorpal.delimiter('Library $ ').show();
  attachCommands();
}

main();
