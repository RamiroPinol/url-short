var express = require("express")
var app = express();
var mongo = require("mongodb").MongoClient
var url = "mongodb://localhost:27017/test"
var async = require("async");

//TO-DO: ver como parar la ejecucion y devolver valor a res.end()

function main(input, callback) {
    var input = input;
    var link;
    mongo.connect(url, function(err, db) {
        if (err) throw err;
        var links = db.collection('links');
        async.waterfall([

        // Check if input is new URL (true) or short link (false)
        function (callback) {
            var is_url = isNaN(Number(input));
            callback(null, is_url);
        },
        
        // If input is short_link, returns original_url
        function (is_url, callback) {
            if (!is_url) {
                links.find( {"short_url" : "https://little-url.herokuapp.com/" + input} ).toArray(function(err, data) {
                    link = data[0].original_url;
                    if (err) throw err;
                    callback(null, link);
                });
            } else {
                callback(null);
            }
        },
        
        // Searches for URL in DB, return it if exists
        function (callback) {
            var clean = input.toString().slice(4);
            links.find({ "original_url" : clean }).toArray(function(err, data) {
                if (err) throw err;
                if (data != 0) {
                    //Aca deberia devolver original_url
                    var original_url = data[0];
                    callback(null, original_url);
                } else {
                    callback(null, clean);
                }
            });
        },
        
        // Count URLs in database to set next URL ID/short_link number
        function (clean, callback) {
            links.count(function (err, countLinks) {
                if (err) throw err;
                callback(null, clean, countLinks)
            })
        },
        
        //Adds non-existent URL to DB and returns the object
        function (clean, countLinks, callback) {
            var countLinks = countLinks + 1;
            links.insert({
                    _id : countLinks,
                    "original_url": clean,
                    "short_url" : "https://little-url.herokuapp.com/" + countLinks
                    }, function(err, result) {
                        if (err) throw err;
                        console.log("URL added to DB");
                        //Esto tengo que devolver
                        var json = result.ops[0]
                        callback(null, json);
            })
        },
   
    ], function (error, success) {
        if (error) {
            console.log(error)
        } else {
            console.log(success)
        }
        });
    })
};

app.get('/:url*', function (req, res) {
    var dire = req.url.slice(1);
    var out = main(dire);
    console.log(out);
    //res.send(main(dire));
});

app.listen(process.env.PORT || 8080, function () {
  console.log('URL-Shortener app listening on port 8080!');
});