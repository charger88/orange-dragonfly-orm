/**
 * Abstract DB Driver
 */
class AbstractDB {

  config = null
  connection = null

  /**
   * Sets config
   * @param config
   */
  constructor (config) {
    this.config = config
  }

  /**
   * Connects to DB (should set "connection" property of the object)
   * @abstract
   * @return
   */
  connect () {
    throw new Error('Method "connect" should be overloaded.')
  }

  /**
   * Disconnects from DB (should also set "connection" property of the object as null)
   * @abstract
   */
  disconnect () {
    throw new Error('Method "disconnect" should be overloaded.')
  }

  /**
   * Run SQL query
   * @param sql
   * @param params
   * @param retry
   * @return {Promise<any>}
   */
  q (sql, params, retry=false) {
    this.config['debug'] && console.debug(sql, params)
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.query(sql, params || [], (err, res) => {
          if (err) {
            this.disconnect()
            if (retry) {
              reject(new Error(`DB Query problem: ${err}`))
            } else {
              this.q(sql, params, true).then(resolve).catch(reject)
            }
          } else {
            resolve(res)
          }
        })
      }).catch(reject)
    })
  }

  /**
   * Returns connection
   * @return {*}
   */
  getConnection () {
    if (this.connection) {
      return new Promise(resolve => {
        resolve(this.connection)
      })
    } else {
      return this.connect()
    }
  }

}

module.exports = AbstractDB