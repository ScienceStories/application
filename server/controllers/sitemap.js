const Story = require('../models').story;
const Member = require('../models').member;
const appFetch = require('../../app').appFetch;
const Sequelize = require('sequelize');
const fs = require('fs');
const sequelize = require('../models').sequelize
const hbs = require('handlebars');
const moment = require('moment');
module.exports = {

  generate(req, res) {
    var urlset = []
    lastmod = moment().format('YYYY-MM-DD')
    // Add Homepage
    urlset.push({
      loc: '/',
      lastmod: lastmod,
      changefreq: 'weekly',
      priority: 1
    })
    // Add Donate
    urlset.push({
      loc: '/donate',
      lastmod: lastmod,
      changefreq: 'daily',
      priority: .3
    })
    // Add Bibliography
    urlset.push({
      loc: '/bibliography',
      lastmod: lastmod,
      changefreq: 'daily',
      priority: .3
    })

    // Add Member Pages
    Member.findAll({attributes:['username']}).then(members => {
      for (var i = 0; i < members.length; i++) {
        urlset.push({
          loc: '/member:'+members[i].dataValues.username,
          lastmod: lastmod,
          changefreq: 'daily',
          priority: .3
        })
      }

      Story.findAndCountAll({
        attributes: ['qid']
      }).then(result => {

          // Add Browse pages
          urlset.push({
            loc: '/browse',
            lastmod: lastmod,
            changefreq: 'daily',
            priority: .5
          })
          maxPage = Math.ceil(result.count/50) + 1;
          for (var i = 1; i < maxPage; i++) {
            urlset.push({
              loc: '/browse?page='+i,
              lastmod: lastmod,
              changefreq: 'daily',
              priority: .5
            })
          }
          // Add stories
          for (var i = 0; i < result.count; i++) {
            urlset.push({
              loc: '/'+result.rows[i].qid,
              lastmod: lastmod,
              changefreq: 'daily',
              priority: .8
            })
          }
          res.render('sitemap', {urlset:urlset})
      });
    })


  },

};
