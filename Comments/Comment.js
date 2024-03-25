const Initializer = require("../Initializers/InitializerMega");
const MegaAPI = require("../MegaApi");

class Comment{
    constructor(idComment, idPost, userId, userName, content, answerTo){
        this.idComment = idComment;
        this.idPost = idPost;
        this.userId = userId;
        this.userName = userName;
        this.content = content;
        this.answerTo = answerTo;
        this.likes = [];
        this.answers = [];
    }

    async isNewComment(name){
      let element = await MegaAPI.findElementInFolder(Initializer.commentsFolder,name);
      return element ? false : true;
    }

}

module.exports = Comment;