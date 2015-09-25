/**
 * Created by Namdascious on 6/4/2015.
 */
var rp = require('request-promise');
var config = require('../config.js');
var http = require('http');
var url = require('url');

var giantbomb = {

    getGames: function(query, max){
        var gbRef = config.giant_bomb;
        var limit = max !== null && max !== undefined ? max : gbRef.limit;
        var gburl = gbRef.url + gbRef.endpoints.search + '/?api_key=' + gbRef.key + '&limit=' + limit + '&format=' + gbRef.formats.json + '&query="' + query + '"&resources=' + gbRef.resources.game + '&field_list=id,name,image,original_release_date';
        return rp(gburl);
    },
    
    getGamesForPlatform: function (platformid, max, offset) {
        var gbRef = config.giant_bomb;
        var limit = max !== null && max !== undefined ? max : gbRef.limit;
        var gburl = gbRef.url + gbRef.endpoints.games + '/?api_key=' + gbRef.key + '&limit=' + limit + '&offset=' + offset + '&format=' + gbRef.formats.json + '&platforms=' + platformid + '&field_list=id,name,original_release_date';
        return rp(gburl);
    },

    getGame: function(){

    },

    getGenres: function(){

    },

    getGenre: function(){

    },

    getPlatforms: function(max){
        var gbRef = config.giant_bomb;
        var limit = max !== null && max !== undefined ? max : gbRef.limit;
        var gburl = gbRef.url + gbRef.endpoints.platforms + '/?api_key=' + gbRef.key + '&limit=' + limit + '&format=' + gbRef.formats.json;  /*+ '&field_list=id,name,image,original_release_date'*/;
        return rp(gburl);
    },

    getPlatform: function(){

    }
};

module.exports = giantbomb;
