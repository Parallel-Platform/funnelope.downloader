/* ===============================================================================
 * Name: app.js
 * Project: funnelope.fetcher
 * Date: 09/18/2015
 * 
 * Description: Runs on a schedule, and syncs the list of games in funnelope DB
 * =============================================================================*/
var Q = require('q');
var fs = require('fs');
var async = require('async');
var Fireproof = require('fireproof');
Fireproof.bless(Q);

var Firebase = require('firebase');

var _ = require('underscore');
var parseXML = require('xml2js').parseString;

var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 1000);
var gameDB = require('./libs/thegamedb');
var giantbomb = require('./libs/giantbomb.js');
var config = require('./config');
var newplatforms = require('./platforms.json').platforms;

function removeColon(name) {
    return name.replace(':', '_');
}

var popularSystemShortNames = {
    microsoft_xbox_one : ['xboxOne'],
    nintendo_wii_u : ['wiiu'],
    sony_playstation_4 : ['ps4'],
}

var popularsystemlist = [
    { name: 'microsoft-xbox-one' },
    { name: 'nintendo-wii-u' },
    { name: 'sony-playstation-4' },
    { name: 'pc' }
]

var filename = 'games.json';
var gamesStore = require('./games.json');
var newGamesStore = require('./newgames.json');

gamesStore.games = gamesStore.games == null || gamesStore.games == undefined ? [] : gamesStore.games;
newGamesStore.games = newGamesStore.games == null || newGamesStore.games == undefined ? [] : newGamesStore.games;

var lastpositionacquired = false;
var asyncFunctionsArray = [];
var platforms = [];
var newplatformids = [];
var currPlatformid = '';

var processGames = function (results, platformid, limit, offset, callback) {
    if (results !== null && results !== undefined && results !== '') {
        var data = JSON.parse(results);
        
        var pageResultsCount = data.number_of_page_results;
        var totalResultsCount = data.number_of_total_results;
        var currSystem = _.findWhere(newplatforms, { id: platformid });
        
        console.log('Processing games for platform ' + currSystem.name + ' | Offset: ' + offset);
        
        //process games returned
        _.each(data.results, function (game, gameindex) {
            var newGame = {
                title: game.name,
                alias : currSystem.abbreviation !== null && currSystem.abbreviation !== undefined ? currSystem.abbreviation : '',
                system: currSystem.name,
                releasedate : game.original_release_date
            };
            
            var gameExists = _.findWhere(newGamesStore.games, { title: game.name, system: currSystem.name });
            
            if (gameExists == null || gameExists == undefined) {
                newGamesStore.games.push(newGame);
                console.log('Added ' + currSystem.name + ' game: ' + game.name);
        
            }
        });
        
        if (offset + pageResultsCount >= totalResultsCount) {
            console.log('---------------- COMPLETE games for platform ' + currSystem.name + '-------------------');
            //we've reached the end. Call the callback
            callback();
        }
        else {
            //Call the giantbomb method recursively, and pass in an offset + 100
            offset += pageResultsCount;
            console.log('calling giantbomb for platform ' + currSystem.name + ' | Offset: ' + offset);
            giantbomb.getGamesForPlatform(platformid, limit, offset, callback).then(function (results) {
                processGames(results, platformid, limit, offset, callback);
            });
        }
    }
    else {
        callback();
    }
}

function updateNewGames(){
    console.log('========================= STARTING NEW GAMES PROCESSING ========================');

    var ps4 = _.findWhere(newplatforms, { name : 'PlayStation 4' });
    var ps3 = _.findWhere(newplatforms, { name : 'PlayStation 3' });
    var xboxOne = _.findWhere(newplatforms, { name : 'Xbox One' });
    var xbox360 = _.findWhere(newplatforms, { name : 'Xbox 360' });
    var wii = _.findWhere(newplatforms, { name : 'Wii' });
    var wiiu = _.findWhere(newplatforms, { name : 'Wii U' });
    var pc = _.findWhere(newplatforms, { name : 'PC' });

    if (ps4 !== null && ps4 !== undefined) {
        newplatformids.push(ps4.id);
    }

    if (ps3 !== null && ps3 !== undefined) {
        newplatformids.push(ps3.id);
    }

    if (xbox360 !== null && xbox360 !== undefined) {
        newplatformids.push(xbox360.id);
    }

    if (xboxOne !== null && xboxOne !== undefined) {
        newplatformids.push(xboxOne.id);
    }

    if (wii !== null && wii !== undefined) {
        newplatformids.push(wii.id);
    }

    if (wiiu !== null && wiiu !== undefined) {
        newplatformids.push(wiiu.id);
    }

    if (pc !== null && pc !== undefined) {
        newplatformids.push(pc.id);
    }
    
    var processFunction = function (callback) {
        var platformid = newplatformids[0];
        newplatformids.splice(0, 1);

        var limit = 100;
        var offset = 0;
        
        console.log('Calling giantbomb for platform ' + _.findWhere(newplatforms, { id: platformid }).name + ' | Offset: ' + offset);
        
        //Get Games for the platform
        giantbomb.getGamesForPlatform(platformid, limit, offset).then(function (results) {
            processGames(results, platformid, limit, offset, callback);
        });
    }

    for (index = 0; index <= newplatformids.length - 1; index++) {
        asyncFunctionsArray.push(processFunction);
    }

    //Now use async to process our thingy in series
    async.series(asyncFunctionsArray, function (err) {
        if (err) { console.log('The process errored out'); return; }
        
        var strJson = JSON.stringify(newGamesStore, null, 4);
        fs.writeFileSync("newgames.json", strJson);
        
        console.log('New games written to file');
        console.log('========================= ALL GAMES PROCESSING COMPLETE ========================');
    });
}

updateNewGames();


//gameDB.getGamesPlatformList().then(function (data) {
    
//    var options = {
//        tagNameProcessors: [removeColon],
//        ignoreAttrs : false
//    }
    
//    parseXML(data, options, function (err, parsedResult) {
//        var gamesTitles = '';
        
//        if (parsedResult.Data !== null && parsedResult.Data !== undefined && parsedResult.Data.Platforms !== null && parsedResult.Data.Platforms !== undefined && parsedResult.Data.Platforms.length > 0) {
//            _.each(parsedResult.Data.Platforms, function (platformArray) {
//                if (platformArray !== null && platformArray !== undefined && platformArray.Platform !== null && platformArray.Platform !== undefined && platformArray.Platform.length > 0) {
//                    _.each(platformArray.Platform, function (platformItems) {
//                        var aliasArray = platformItems.alias;
//                        var idArray = platformItems.id;
//                        var nameArray = platformItems.name;
                        
//                        //Get the platforms into our own array
//                        var platform = {};
                        
//                        platform.alias = aliasArray !== null && aliasArray !== undefined && aliasArray.length > 0 ? aliasArray[0] : '';
//                        platform.id = idArray !== null && idArray !== undefined && idArray.length > 0 ? idArray[0] : '';
//                        platform.name = nameArray !== null && nameArray !== undefined && nameArray.length > 0 ? nameArray[0] : '';
                        
//                        platforms.push(platform);
//                    })
//                }
//            });
            
//            var processFunctions = [];
            
//            _.each(platforms, function (platform, platformindex) {
//                gameDB.getGamesByPlatform(platform.id, platform.name).then(function (gamesData) {
                    
//                    var childOptions = {
//                        tagNameProcessors: [removeColon],
//                        ignoreAttrs : false
//                    }
                    
//                    parseXML(gamesData, childOptions, function (err, parsedGameResult) {
//                        if (parsedGameResult.Data !== null && parsedGameResult.Data !== undefined && parsedGameResult.Data.Game !== null && parsedGameResult.Data.Game !== undefined && parsedGameResult.Data.Game.length > 0) {
                            
//                            _.each(parsedGameResult.Data.Game, function (gameArray, gameArrayIndex) {
//                                var gameTitle = gameArray.GameTitle !== null && gameArray.GameTitle !== undefined && gameArray.GameTitle.length > 0 ? gameArray.GameTitle[0] : null;
//                                var id = gameArray.id !== null && gameArray.id !== undefined && gameArray.id.length > 0 ? gameArray.id[0] : null;
//                                var releaseDate = gameArray.ReleaseDate !== null && gameArray.ReleaseDate !== undefined && gameArray.ReleaseDate.length > 0 ? gameArray.ReleaseDate[0] : null;
                                
//                                console.log('processing ' + platform.name + ' game : ' + gameTitle);

//                                if (gameTitle !== null && gameTitle !== undefined && gameTitle !== '' && id !== null && id !== undefined && id !== '') {

//                                    var foundGame = _.findWhere(gamesStore, { gamedbid: id });
                                    
//                                    if (foundGame == null || foundGame == undefined) {
//                                        //write game to json file
//                                        var newGame = {
//                                            gamedbid: id,
//                                            title: gameTitle,
//                                            gamedbsystemid : platform.id,
//                                            gamedbsystemalias : platform.alias,
//                                            gamedbsystemname: platform.name,
//                                            systemgameindex: platform.alias + gameTitle,
//                                            releasedate : new Date(releaseDate).toDateString()
//                                        }

//                                        gamesStore.games.push(newGame);
//                                        console.log('added game: ' + gameTitle + ' | system: ' + platform.name);
//                                    }
//                                }
//                            })

//                            //write contents of this game to file
//                            var strJson = JSON.stringify(gamesStore, null, 4);
//                            fs.writeFileSync("games.json", strJson);
//                        }
//                    });
//                });
//            });
//        }
//    });
//});







