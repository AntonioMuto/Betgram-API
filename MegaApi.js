const { json } = require("express");
const CommentsDocument = require("./Comments/CommentsDocument");
const InitializerMega = require("./Initializers/InitializerMega");

class MegaAPI {

    static findElementInStorage(storage, elementName) {
        const element = storage.root.children.find(file => file.name === elementName.toString());
        if (element != null) {
            return element;
        } else {
            return null;
        }
    }

    static findElementInFolder(folder, elementName) {
        const element = folder.children.find(file => file.name === `${elementName}.json`)
        if (element != null) {
            return element;
        } else {
            return null;
        }
    }

    static async uploadElement(folder, name, content) {
        const upl = await folder.upload(`${name}.json`, content).complete
        return upl;
    }

    static async uploadComment(folder, name, comment) {
        let commentDocument = new CommentsDocument(name);
        commentDocument.comments.push(comment);
        const upl = await folder.upload(`${name}.json`, JSON.stringify(commentDocument)).complete
        return upl;
    }

    static async updateComments(idPost, newComment) {
        let elementFound = await this.findElementInFolder(InitializerMega.commentsFolder, idPost);
        if (elementFound != null) {
            let comment = await this.readElement(elementFound);
            let x = comment.comments.find(obj => obj.idComment === newComment.answerTo);
            if (x) {
                x.answers.push(newComment);
            } else {
                comment.comments.push(newComment);
            }
            elementFound.delete();
            let updated = await this.uploadElement(InitializerMega.commentsFolder, idPost, JSON.stringify(comment));
            return updated
        }
        return null;
    }

    static async readElement(file) {
        var result = await new Promise(async (resolve, reject) => {
            file.downloadBuffer((error, data) => {
                if (error) {
                    console.error(error);
                    reject(error);
                } else {
                    const jsonString = data.toString('utf8');
                    const parsedData = JSON.parse(jsonString);
                    resolve(parsedData);
                }
            });
        });
        return result;
    }

    static async updateCurrentCommentId(element, newId) {
        element.delete();
        let uploadnewId = await this.uploadElement(InitializerMega.commentsFolder, 'idCommentsTrack', `{"current": ${newId}}`);
        return uploadnewId ? true : false;
    }

    static async retrieveCurrentCommentId() {
        let elementFound = await this.findElementInFolder(InitializerMega.commentsFolder, 'idCommentsTrack');
        let track = await this.readElement(elementFound);
        let updated = await this.updateCurrentCommentId(elementFound, track.current + 1);
        return updated ? track.current + 1 : null;
    }


}

module.exports = MegaAPI;