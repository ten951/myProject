var mongodb = require('./db'),
    Comment = require('../models/comment.js');

function Post(name, title, post) {
    this.name = name;
    this.title = title;
    this.post = post;
}
//存储一篇文章及其相关的信息
Post.prototype.save = function (callback) {
    var date = new Date();
    //存储各种时间格式 方便以后拓展使用
    var time = {
        date: date,
        year: date.getFullYear(),
        month: date.getFullYear() + "-" + (date.getMonth() + 1),
        day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };

    //要存如数据库的文档
    var post = {
        name: this.name,
        time: time,
        title: this.title,
        post: this.post,
        comments: [],
        pv: 0
    };
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //将文档插入数据库
            collection.insert(post, {safe: true}, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err); //返回失败原因
                }
                callback(null); //返回null
            });
        });

    });
};
//读取文章及其相关信息
Post.getAll = function (name, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            //根据query对象查询文章
            collection.find(query).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                //解析 markdown 为 html
                docs.forEach(function (doc) {
                    doc.post = markdown.toHTML(doc.post);
                });
                return callback(null, docs); //成功以数组的形式返回查询结果
            });
        });

    });
};

Post.getTen = function (name, page, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }

            //使用count返回特定查询的文档数, total
            collection.count(query, function (err, total) {
                //根据query对象查询,并跳过前(page-1)*10个结果  返回之后的10个结果
                collection.find(query, {
                    skip: (page - 1) * 10,
                    limit: 10
                }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }

                    callback(null, docs, total);
                });
            });
        });

    });
};

Post.getOne = function (name, day, title, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback();
        }


        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.findOne({
                'name': name,
                'time.day': day,
                'title': title
            }, function (err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                if (doc) {
                    //没访问1次  pv值增加1
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    }, {
                        $inc: {'pv': 1}
                    }, function (err) {
                        if (err) {
                            mongodb.close();
                            return callback(err);
                        }
                    });
                    callback(null, doc);
                }
            });
        });
    });
};

Post.edit = function (name, day, title, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                'name': name,
                'time.day': day,
                'title': title
            }, function (err, doc) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, doc);
            });
        });
    });
};

Post.update = function (name, day, title, post, callback) {
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
                $set: {post: post}
            }, function (err) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                callback(null);
            })
        });
    });
};

Post.remove = function (name, day, title, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.remove({
                'name': name,
                'time.day': day,
                'title': title
            }, {
                w: 1
            }, function (err) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

Post.search = function (keyword, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var pattern = new RegExp(keyword, 'i');
            /*new RegExp(pattern, attributes);
             参数 pattern 是一个字符串，指定了正则表达式的模式或其他正则表达式。
             参数 attributes 是一个可选的字符串，包含属性 "g"、"i" 和 "m"，分别用于指定全局匹配、区分大小写的匹配和多行匹配。
             */
            collection.find({
                'title': pattern
            }, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time : -1
            }).toArray(function (err,docs) {
                if(err) {
                    mongodb.close();
                    return callback();
                }
                callback(null,docs);
            });

        });
    });
};
module.exports = Post;