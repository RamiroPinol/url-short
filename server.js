var express = require("express")
var app = express();
var mongo = require("mongodb").MongoClient
var url = "mongodb://localhost:27017/test"
var async = require("async");
var validator = require("validator");
var crypto = require('crypto');

// Creates a 4-length hash from SHA256 to use as short-links/ID
function hash(id) {
  var hash = crypto.createHash('sha256')
        .update(new Date().getTime().toString() + "" + id)
        .digest('hex')
        return(hash.slice(4, 8));
}

function main(input, res, callback) {
    var input = input;
    var link;
    mongo.connect(url, function(err, db) {
        if (err) throw err;
        var links = db.collection('links');
        async.series([

        function (callback) {
            // Check if input is new URL (true) or short link (false)
            // by checking if input in alphanumeric (URLs has symbols).
            // Then return original URL if input is short link
            if (validator.isAlphanumeric(input, ["en-US"])) {
                links.find( {"short_url" : "https://little-url.herokuapp.com/" + input} ).toArray(function(err, data) {
                    link = data[0].original_url;
                    if (err) throw err;
                    callback(null, link);
                    return
                });
            } else {
                
                //Return data json if URL already exists in DB
                links.find({ "original_url" : input }).toArray(function(err, data) {
                    if (err) throw err;
                    if (data != 0) {
                        var original_url = data[0];
                        callback(null, original_url);
                        return
                    } else {
                        
                        // If URL not in DB, adds it and return data json
                        links.count(function (err, countLinks) {
                            if (err) throw err;
                            var id = hash(countLinks + 1);
                            links.insert({
                                    _id : id,
                                    "original_url": input,
                                    "short_url" : "https://little-url.herokuapp.com/" + id
                                    }, function(err, result) {
                                        if (err) throw err;
                                        console.log("URL added to DB");
                                        var json = result.ops[0]
                                        callback(null, json);
                                        return
                            })
                        })
                    }
                })
            }
        },
    // Result of main can be only string (URL) or JSON
    // so callback function redirects to URL is response is str
    // send JSON otherwise
    ], function (error, success) {
        if (error) {
            console.log(error)
        } else {
            var success = success[0];
            if (typeof success == "string") {
                res.redirect(success);
            } else {
                res.send(success);
            }
        }
        });
    })
};

app.get('/:url*', function (req, res) {
    var input = req.url.slice(1);
    if (validator.isAlphanumeric(input, ["en-US"])) {
        main(input, res);
    } else {
        var div = input.indexOf("/") + 1;
        var pre = input.slice(0, div);
        var url = input.slice(div);
        //validator validates some bad URLs
        if (pre == "new/" && validator.isURL(url)) {
            main(url, res);
        } else {
            res.send("ERROR: invalid syntax or URL")
        }
    }
    
});

app.listen(process.env.PORT || 8080, function () {
  console.log('URL-Shortener app listening on port 8080!');
});