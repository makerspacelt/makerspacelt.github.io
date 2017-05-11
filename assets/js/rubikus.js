/*
 * Rubikus.js
 *
 * Copyright 2013, Karolis Grinkus - http://kartais.lt
 *
 * Github: https://github.com/makerspacelt/Rubikus.js
 */

(function (undefined) {
    'use strict';
    var Rubikus = Rubikus || function (userOpts) {
        var settings = {
                canvas: null,
                hash: '358ed264d3b8a832b86bc4db745f182ef71bc65fd0a62dd5d760862fe1c3986b' // 'makerspace' in SHA256
            },
            cache = {},
            colours,
            hash,
            hue,
            utils = {
                extend: function (destination, source) {
                    for (var property in source) {
                        if (source[property] && source[property].constructor && source[property].constructor === Object) {
                            destination[property] = destination[property] || {};
                            utils.extend(destination[property], source[property]);
                        } else {
                            destination[property] = source[property];
                        }
                    }
                    return destination;
                },

                pad: function (number, places) {
                    number = number.toString();
                    if (typeof places === 'undefined') {
                        places = 4;
                    }

                    if (number.length >= places) {
                        return number;
                    }

                    number = '0' + number;
                    return utils.pad(number, places);
                },

                drawSingleCube: function (which) {
                    var x = Math.floor(which / 16),
                        y = Math.floor((which - x * 16) / 4),
                        z = which - x * 16 - y * 4,
                        hex = parseInt(hash[which], 16),
                        bin = utils.pad(hex.toString(2)),
                        halfX = cache.width / 2,
                        halfY = cache.height / 2,
                        midX = 4 * halfX - halfX * x + halfX * y,
                        midY = 4 * cache.height + halfY * (x + y) - cache.height * z,
                        ctx = settings.canvas.getContext('2d'),
                        colour = {
                            top: colours[utils.chooseColour(bin.substr(0, 2))],
                            left: colours[utils.chooseColour(bin.substr(1, 2))],
                            right: colours[utils.chooseColour(bin.substr(2, 2))]
                        };

                    if ((hex < 2) || (hex > 11)) {
                        ctx.beginPath();
                        ctx.fillStyle = colour.top;
                        ctx.moveTo(midX, midY);
                        ctx.lineTo(midX - halfX, midY - halfY);
                        ctx.lineTo(midX, midY - cache.height);
                        ctx.lineTo(midX + halfX, midY - halfY);
                        ctx.fill();
                        ctx.lineWidth = 1; ctx.strokeStyle = colour.top; ctx.closePath(); ctx.stroke();

                        ctx.beginPath();
                        ctx.fillStyle = colour.left;
                        ctx.moveTo(midX, midY);
                        ctx.lineTo(midX - halfX, midY - halfY);
                        ctx.lineTo(midX - halfX, midY - halfY + cache.height);
                        ctx.lineTo(midX, midY + cache.height);
                        ctx.fill();
                        ctx.lineWidth = 1; ctx.strokeStyle = colour.left; ctx.closePath(); ctx.stroke();

                        ctx.beginPath();
                        ctx.fillStyle = colour.right;
                        ctx.moveTo(midX, midY);
                        ctx.lineTo(midX + halfX, midY - halfY);
                        ctx.lineTo(midX + halfX, midY - halfY + cache.height);
                        ctx.lineTo(midX, midY + cache.height);
                        ctx.fill();
                        ctx.lineWidth = 1; ctx.strokeStyle = colour.right; ctx.closePath(); ctx.stroke();
                    }
                },

                setHash: function (newHash) {
                    settings.hash = newHash;
                    hash = settings.hash.split('');

                    utils.resetHue();
                },

                resetHue: function () {
                    hue = undefined;
                    for (var i = hash.length - 1; i >= 0; i -= 1) {
                        hue = hue ^ hash[i];
                    }

                    hue = hue * 22.5 - 90;

                    colours = [
                        'hsla(' + hue + ', 75%, 50%, 1)',
                        'hsla(' + (hue + 20) + ', 75%, 50%, 1)',
                        'hsla(' + (hue - 20) + ', 75%, 50%, 1)'
                    ];

                    drawAllCubes();
                },

                getHue: function () {
                    return hue;
                },

                chooseColour: function (bin) {
                    var dec = parseInt(bin, 2);

                    if (dec === 0) {
                        return 0;
                    } else if (dec === 3) {
                        return 2;
                    }
                    return 1;
                },

                output: function () {
                    return settings.canvas.toDataURL("image/png");
                }
            },

            drawAllCubes = function () {
                var canvas = settings.canvas,
                    ctx = canvas.getContext('2d'),
                    height = canvas.offsetHeight,
                    width = canvas.offsetWidth;

                ctx.clearRect(0, 0, width, height);

                for (var i = 0; i < hash.length; i += 1) {
                    utils.drawSingleCube(i);
                }

                ctx.fillStyle = '#fff';
                ctx.font = '900 ' + settings.canvas.offsetWidth / 2 + 'px "Source Sans Pro"';
                ctx.fillText('M', Math.floor(width / 3.27), Math.floor(height / 1.547085202));
            },

            init = function (opts) {
                utils.extend(settings, opts);

                cache.width = Math.floor(settings.canvas.offsetWidth / 4);
                cache.height = Math.floor(cache.width / Math.sqrt(3));

                settings.canvas.setAttribute('height', Math.floor(settings.canvas.offsetWidth * 1.15));

                utils.setHash(settings.hash);
            };

        this.setHash = utils.setHash;
        this.getHue = utils.getHue;
        this.output = utils.output;

        init(userOpts);
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Rubikus;
    }

    if (typeof ender === 'undefined') {
        this.Rubikus = Rubikus;
    }

    if (typeof define === "function" && define.amd) {
        define('Rubikus', [], function () { 
            return Rubikus; 
        });
    }
}).call(this);
