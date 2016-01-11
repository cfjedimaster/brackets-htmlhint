/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, HTMLHint */

define(function (require) {
    "use strict";

    var FileSystem      = brackets.getModule("filesystem/FileSystem");
    var CodeInspection  = brackets.getModule("language/CodeInspection");
    var LanguageManager = brackets.getModule("language/LanguageManager");
    var ProjectManager  = brackets.getModule("project/ProjectManager");
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");

    var htmlpm = PreferencesManager.getExtensionPrefs("htmlhint");
    var htmlDefaults;
    htmlpm.definePreference("options", "object", {})
        .on("change", function () {
            htmlDefaults = htmlpm.get("options");
        });
    htmlDefaults = htmlpm.get("options");

    var xmlpm = PreferencesManager.getExtensionPrefs("xmlhint");
    var xmlDefaults;
    xmlpm.definePreference("options", "object", {
        "doctype-first": false
    }).on("change", function () {
        xmlDefaults = xmlpm.get("options");
    });
    xmlDefaults = xmlpm.get("options");

    var csspm = PreferencesManager.getExtensionPrefs("csslint");
    var cssDefaults;
    csspm.on("change", function () {
        cssDefaults = csspm.get("options");
    });
    cssDefaults = csspm.get("options");

    var jspm = PreferencesManager.getExtensionPrefs("jshint");
    var jsDefaults;
    jspm.on("change", function () {
        jsDefaults = jspm.get("options");
    });
    jsDefaults = jspm.get("options");

    require("htmlhint/htmlhint");

    function _hinter(text, fullPath, configFileName, defaults) {
        return _loadRules(configFileName).then(function (rules) {
            var results = HTMLHint.verify(text, $.extend(true, {}, defaults, rules));
            if (results.length) {
                var result = {
                    errors: []
                };

                for (var i = 0, len = results.length; i < len; i++) {
                    var messageOb = results[i];
                    if (!messageOb.line) {
                        continue;
                    }
                    //default
                    var type = CodeInspection.Type.WARNING;

                    if (messageOb.type === "error") {
                        type = CodeInspection.Type.ERROR;
                    } else if (messageOb.type === "warning") {
                        type = CodeInspection.Type.WARNING;
                    }

                    result.errors.push({
                        pos: {
                            line: messageOb.line - 1,
                            ch: messageOb.col
                        },
                        message: messageOb.message,
                        type: type
                    });
                }

                return result;
            } else {
                //no errors
                return null;
            }
        });
    }

    function htmlHinter(text, fullPath) {
        var defaults = htmlDefaults;
        return _loadRules(".jshintrc").then(function (rules) {
            defaults.jshint = $.extend(true, {}, jsDefaults||{}, rules);
            return _loadRules(".csslintrc");
        }).then(function (rules) {
            defaults.csslint = $.extend(true, {}, cssDefaults||{}, rules);
            return _hinter(text, fullPath, ".htmlhintrc", defaults);
        });
    }

    function xmlHinter(text, fullPath) {
        return _hinter(text, fullPath, ".xmlhintrc", xmlDefaults);
    }

    function _loadRules(configFileName) {
        var result = new $.Deferred();

        var projectRootEntry = ProjectManager.getProjectRoot();
        if (!projectRootEntry) {
            return result.resolve(undefined).promise();
        }

        var file = FileSystem.getFileForPath(projectRootEntry.fullPath + configFileName);
        file.read(function (err, content) {
            if (err) {
                result.resolve(undefined);
                return;
            }

            var config;
            if (!content) {
                result.resolve(undefined);
                return;
            }

            try {
                config = JSON.parse(content);
            } catch (e) {
                //console.error("HTMLHint: error parsing " + file.fullPath + ". Details: " + e);
                result.reject(e);
                return;
            }

            result.resolve(config);
        });
        return result.promise();
    }

    CodeInspection.register("html", {
        name: "HTMLHint",
        scanFileAsync: htmlHinter
    });
    CodeInspection.register("htm", {
        name: "HTMLHint",
        scanFileAsync: htmlHinter
    });

    CodeInspection.register("xml", {
        name: "XMLHint",
        scanFileAsync: xmlHinter
    });

    LanguageManager.getLanguage("json").addFileName([".htmlhintrc", ".xmlhintrc"]);
});
