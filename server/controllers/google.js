const { google } = require('googleapis')
const GOOGLE_PRIVATE_KEY = Buffer.from(process.env.GOOGLE_PRIVATE_KEY, 'base64');
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const GOOGLE_VIEW_ID = process.env.GOOGLE_VIEW_ID
const googlejwt = new google.auth.JWT(process.env.GOOGLE_CLIENT_EMAIL, null,  GOOGLE_PRIVATE_KEY, GOOGLE_SCOPE)
const GOOGLE_OLDEST_DATE = '2018-06-16'
const analyticsreporting = google.analyticsreporting({version: 'v4', auth: googlejwt});
// Help making api queries https://ga-dev-tools.appspot.com/query-explorer/
module.exports = {
  async getData(metrics, dateRanges, callback){
    var checkedDates = module.exports.processDateRange(dateRanges)
    var checkedMetrics = module.exports.processMetrics(metrics)
    const authorizeJWT = await googlejwt.authorize()
    return analyticsreporting.reports.batchGet({
   resource: {
     reportRequests: [{
       viewId: GOOGLE_VIEW_ID,
       dateRanges: dateRanges,
       metrics: checkedMetrics
     }]
   }}, (err, res) => {
     if (err) {
      throw err;
    }
    return callback(res.data.reports[0].data);
  }
   )
  },
  async getDataByResource(obj, callback){
    const authorizeJWT = await googlejwt.authorize()
    return analyticsreporting.reports.batchGet({
      resource: { reportRequests: obj}}, (err, res) => {
     if (err) {
      throw err;
    }
    return callback(res.data.reports[0].data);
  }
   )
  },
  getUsers(dateRanges, callback){
    // example: getUsers(['today'], callback)
    module.exports.getData(['ga:users'], dateRanges, function(result){
      return callback(result)
    })
  },
  getSessions(dateRanges, callback){
    module.exports.getData(['ga:sessions'], dateRanges, function(result){
      return callback(result)
    })
  },
  getPopularStories(dateRanges, maxPages, callback){
    var resources = [{
      viewId: GOOGLE_VIEW_ID,
      dateRanges: module.exports.processDateRange(dateRanges),
      metrics: [
        {"expression": "ga:pageviews"}
      ],
      "pageSize": maxPages,
      "dimensions": [{"name": "ga:pagePath"}],
      "dimensionFilterClauses": [
        {
          "filters": [
            {
              "dimensionName": "ga:pagePath",
              "operator": "REGEXP",
              "expressions": ["^/Q[0-9]+"]
            }
          ]
        }],
        "orderBys": [

      {
  "fieldName": 'ga:pageviews',
  "sortOrder": 'DESCENDING',
}

  ],

    }]
    module.exports.getDataByResource(resources, function(result){
      return callback(result)
    })

  },
  getAdminStats(callback){
    // Total Sessions, Today Sessions
    // Total Users, Today users
    // Total Page views, today page views
    // 30ago new Users, Today new users
    var adminStats = { }
    module.exports.getData(['ga:sessions', 'ga:users', 'ga:newUsers', 'ga:pageviews'], ['total', 'today'], function(mainRaw){
      var metricData = mainRaw.rows[0].metrics
      var totalData = metricData[0].values
      var todayData = metricData[1].values
      adminStats.sessions_total = totalData[0]
      adminStats.sessions_today = todayData[0]
      adminStats.users_total = totalData[1]
      adminStats.users_today = todayData[1]
      adminStats.newUsers_today = todayData[2]
      adminStats.pageViews_total = totalData[3]
      adminStats.pageViews_today = todayData[3]
      module.exports.getData(['ga:newUsers'], ['month'], function(newUserRaw){
        adminStats.newUsers_month = newUserRaw.rows[0].metrics[0].values[0]
        return callback(adminStats)
      })
    })
  },

  processDateRange(dateRanges){
    for (var i = 0; i < dateRanges.length; i++) {
      if (dateRanges[i] == 'total'){
        dateRanges[i] = {startDate: GOOGLE_OLDEST_DATE, endDate: 'today'}
      }
      else if (dateRanges[i] == 'today'){
        dateRanges[i] = {startDate: 'today', endDate: 'today'}
      }
      else if (dateRanges[i] == 'month'){
        dateRanges[i] = {startDate: '30daysAgo', endDate: 'today'}
      }
      else if (dateRanges[i] == 'week'){
        dateRanges[i] = {startDate: '7daysAgo', endDate: 'today'}
      }
    }
    return dateRanges
  },
  processMetrics(metrics){
    for (var i = 0; i < metrics.length; i++) {
      metrics[i] = { expression: metrics[i] }
    }
    return metrics
  }

}
