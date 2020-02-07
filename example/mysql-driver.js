const AbstractDB = require('./../components/abstract-db');
const mysql = require('mysql');

class MySQLDriver extends AbstractDB {

  connect (){
    return new Promise((resolve, reject) => {
      this.connection = mysql.createConnection({
        host: this.config.host,
        port: this.config.port || 3306,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectTimeout: this.config.connect_timeout || 5000
      });
      this.connection.connect((err) => {
        err ? reject(err) : resolve(this.connection);
      });
    })
  }

  disconnect () {
    if (this.connection) {
      try {
        this.connection.destroy()
      } catch (e) {} finally {
        this.connection = null;
      }
    }
  }

}

module.exports = MySQLDriver