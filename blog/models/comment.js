var mongodb = require('./db');

function Comment(name, day, title, comment) {
    this.name = name,
        this.day = day,
        this.title = title,
        this.comment = comment
}
module.exports = Comment;

Comment.prototype.save = function (callback) {//使用prototype定义方法和不使用定义的方法的区别  后者相当于类的静态方法 不需要new就能直接调用 前者相当于普通方法 需要实例来调用
    var name = this.name,
        day = this.day,
        title = this.title,
        comment = this.comment;

    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.update({
                "name": name,
                "time.day": day,
                "title": title
            }, {
                $push: {"comments": comment}
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};