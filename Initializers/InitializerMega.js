class InitializerMega {

    static initializeFolders(storage) {
        
        InitializerMega.commentsFolder = storage.root.children.find(file => file.name === process.env.COMMENTS_FOLDER);
        InitializerMega.likesFolder = storage.root.children.find(file => file.name === process.env.LIKES_FOLDER);
        InitializerMega.utilityFolder = storage.root.children.find(file => file.name === process.env.UTILITY_FOLDER);
        // InitializerMega.commentsFolder = storage.root.children.find(file => file.name === process.env.MATCH);
        
        InitializerMega.storage = storage;
    }
}

module.exports = InitializerMega;