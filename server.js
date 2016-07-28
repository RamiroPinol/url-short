var express = require("express")
var app = express();
var mongo = require("mongodb").MongoClient
var url = "mongodb://localhost:27017/test"
var async = require("async");

function main(input, res, callback) {
    var input = input;
    var link;
    mongo.connect(url, function(err, db) {
        if (err) throw err;
        var links = db.collection('links');
        async.series([

        function (callback) {
            // Check if input is new URL (true) or short link (false)
            var is_url = isNaN(Number(input));
            
            // Return original URL if input is short link
            if (!is_url) {
                links.find( {"short_url" : "https://little-url.herokuapp.com/" + input} ).toArray(function(err, data) {
                    link = data[0].original_url;
                    if (err) throw err;
                    callback(null, link);
                    return
                });
            } else {
                
                //Return data json if URL already exists in DB
                var clean = input.toString().slice(4);
                links.find({ "original_url" : clean }).toArray(function(err, data) {
                    if (err) throw err;
                    if (data != 0) {
                        var original_url = data[0];
                        callback(null, original_url);
                        return
                    } else {
                        
                        // If URL not in DB, adds it and return data json
                        links.count(function (err, countLinks) {
                            if (err) throw err;
                            var countLinks = countLinks + 1;
                            links.insert({
                                    _id : countLinks,
                                    "original_url": clean,
                                    "short_url" : "https://little-url.herokuapp.com/" + countLinks
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

    ], function (error, success) {
        if (error) {
            console.log(error)
        } else {
            var success = success[0];
            res.send(success);
        }
        });
    })
};

app.get('/:url*', function (req, res) {
    var dire = req.url.slice(1);
    main(dire, res)
});

app.listen(process.env.PORT || 8080, function () {
  console.log('URL-Shortener app listening on port 8080!');
});