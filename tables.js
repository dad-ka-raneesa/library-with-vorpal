const removeTable = function(db, tableName) {
  db.run(`DROP TABLE IF EXISTS ${tableName}`);
};

const createTable = function(db, tableName, tableOptions) {
  const options = tableOptions.map(opt => opt.join(' ')).join(',');
  db.run(`CREATE TABLE ${tableName} (${options})`, (err) => {
    if (err) throw error;
  });
};

const createLibraryTables = function(db) {
  db.serialize(() => {
    removeTable(db, 'book_titles');
    let options = [
      ['ISBN', 'varchar(50)', 'PRIMARY KEY'],
      ['title', 'varchar(50)', 'NOT NULL'],
      ['author', 'varchar(50)', 'NOT NULL'],
      ['publisher_name', 'varchar(50)'],
      ['book_category', 'varchar(30)'],
      ['number_of_copies_total', 'numeric(4)']
    ];
    createTable(db, 'book_titles', options);

    removeTable(db, 'book_copies');
    options = [
      ['serial_number', 'integer', 'PRIMARY KEY', 'AUTOINCREMENT'],
      ['ISBN', 'varchar(50)', 'NOT NULL'],
      ['is_available', 'boolean', 'NOT NULL'],
      ['enrolled_date', 'date'],
      ['available_from', ' date'],
      ['issued_date', ' date'],
      ['library_user_id', 'varchar(50)']
    ];
    createTable(db, 'book_copies', options);

    removeTable(db, 'library_log');
    options = [
      ['action varchar(10)', 'CHECK(action = "issue" OR action = "return")'],
      ['date_of_action', ' date'],
      ['library_user_id', 'varchar(50)'],
      ['serial_number', 'integer']
    ];
    createTable(db, 'library_log', options);
  });
}

module.exports = { createLibraryTables, createTable, removeTable };