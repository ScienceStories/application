const Comment = require('../models').comment;
const appFetch = require('../../app').appFetch;
const loadPage = require('../../app').loadPage;
const loadError = require('../../app').loadError;
const Sequelize = require('sequelize');
const fs = require('fs');
const sequelize = require('../models').sequelize
const hbs = require('handlebars');
module.exports = {

  create(data) {
    return Comment
      .create({
        uri: data.uri,
        status: 'active',
        state: data[data.uri],
        memberId: 1
      })
      .catch(error => {return 0});
  },
  select(comment_id, callback){
    return Comment.findById(comment_id)
      .then(output => callback(output))
  },
  storyList(req, res){
    story_id = req.params.story_id
     module.exports.loadCommentsFromStory(req.params.story_id, function(comments){
       for (var i = 0; i < comments.length; i++) {
         comments[i]
         const template = hbs.compile(`<div class="comment-container depth{{comment.depth}}" data-id={{comment.id}} data-order={{comment.order}} data-parent={{comment.parentId}} >
           <a class="comment-avatar">
             <div class="comment-image-container">
               <img src="{{comment.image}}">
             </div>
           </a>
           <div class="comment-content" >
             <a class="comment-name">{{comment.name}}</a>
             <div class="comment-metadata">
               <span class="comment-date">{{dateFormat comment.createdAt 'calendar' false}}</span>
             </div>
             <div class="comment-message">
               {{comment.message}}
             </div>
             <div class="actions">
               <a class="reply" onclick="replyToggle(this)">Reply</a>
             </div>
             {{#if user.id}}
             <div class="reply-container" style="display:none">
               <a class="comment-avatar">
                 <div class="comment-image-container">
                   <img src="{{#if user.image}}{{user.image}}{{else}}https://upload.wikimedia.org/wikipedia/commons/a/ad/Placeholder_no_text.svg{{/if}}">
                 </div>
               </a>
               <textarea onkeyup="textAreaAdjust(this)" style="overflow:hidden" class="reply-input parent{{#if_equal depth 1}}{{comment.id}}{{else}}{{comment.parentId}}{{/if_equal}}" name="" placeholder="Leave a comment..." id="" rows="1"></textarea>
               <button class="send-reply" data-parent='{{#if_equal comment.depth 1}}{{comment.id}}{{else}}{{comment.parentId}}{{/if_equal}}' onclick="sendComment(this, {{story_id}})">Send</button>
             </div>
             {{else}}
             <div class="reply-container" style="display:none">
               <a class="comment-avatar">
                 <div class="comment-image-container">
                   <img src="{{#if user.image}}{{user.image}}{{else}}https://upload.wikimedia.org/wikipedia/commons/a/ad/Placeholder_no_text.svg{{/if}}">
                 </div>
               </a>
               <textarea onkeyup="textAreaAdjust(this)" style="overflow:hidden" class="reply-input parent{{#if_equal depth 1}}{{comment.id}}{{else}}{{comment.parentId}}{{/if_equal}}" name="" placeholder="Login to leave a comment..." id="" rows="1" disabled></textarea>
               <button class="send-reply" data-parent='{{#if_equal comment.depth 1}}{{comment.id}}{{else}}{{comment.parentId}}{{/if_equal}}' disabled>Send</button>
             </div>
             {{/if}}
           </div>
         </div>
`);
        const html = template({ comment: comments[i], story_id:story_id, user: req.session.user});
        comments[i].html = html;
  // console.log(html); // <h1>Handlebars</h1>
       }
       return res.send({comments: comments, user: req.session.user})
     })
  },
  renderId(req, res){

     module.exports.loadCommentsFromStory(req.params.comment_id, function(comments){

       res.render('blank', {comments: comments, page: function(){ return 'comments'},},
       function(err, html) {
         res.send({data: html})
       }


     )
     })
  },
  recursiveAddHtml(req, res, data, i, callback){
    if (i < data.length){
      res.render('blank', {comments: data[i], page: function(){ return 'comment'},},
      function(err, html) {
        data[i].html = html;
        i += 1;
        module.exports.recursiveAddHtml(req, res, data, i, callback)

      }
      )
    }
    else return callback(data)

  },
  renderList(req, res){
     module.exports.loadCommentsFromStory(req.params.story_id, function(comments){
       res.render('blank', {comments: comments, page: function(){ return 'comments'},})
     })
  },
  loadCommentsFromStory(story_id, callback){
    sequelize.query(`WITH RECURSIVE cte (id, message, path, "parentId", depth, "createdAt", "updatedAt", "memberId")  AS (
            SELECT  id,
        	message,
            array[id] AS path,
            "parentId",
            1 AS depth,
            "createdAt",
            "updatedAt",
            "memberId"

            FROM    comments
            WHERE   "parentId"=0
            AND "storyId"=${story_id}

            UNION ALL

            SELECT  comments.id,
                comments.message,
                cte.path || comments.id,
                comments."parentId",
                cte.depth + 1 AS depth,
                comments."createdAt",
            comments."updatedAt",
            comments."memberId"
            FROM    comments
            JOIN cte ON comments."parentId" = cte.id
            )
            SELECT cte.*, members.username, members.name, members.email, members.image, members.type FROM cte
            join members on members.id = "memberId"
        ORDER BY path;
`, { type: sequelize.QueryTypes.SELECT}).then(comments => {
  for (var i = 0; i < comments.length; i++) {
    comments[i].order = i
  }
  callback(comments);
  })
},
send(req, res){
  return Comment
    .create({
      message: req.body.message,
      storyId: req.body.storyId,
      parentId: req.body.parentId,
      memberId: req.session.user.id,
      status: 0
    })
    .then(out => {
      console.log('SUCCESS', out)
      res.send('success')
    })
    .catch(error => {
      console.log(error);
      res.send('Error')
    });
}


};
