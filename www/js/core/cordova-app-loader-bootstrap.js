(function() {
    // Retrieved and slightly modified from: https://github.com/typicode/pegasus
    // --------------------------------------------------------------------------
    //
    // a   url (naming it a, beacause it will be reused to store callbacks)
    // xhr placeholder to avoid using var, not to be used
    window.pegasus = function pegasus(a, xhr) {
        xhr = new XMLHttpRequest();

        // Open url
        xhr.open('GET', a);

        // Reuse a to store callbacks
        a = [];

        // onSuccess handler
        // onError   handler
        // cb        placeholder to avoid using var, should not be used
        xhr.onreadystatechange = xhr.then = function(onSuccess, onError, cb) {

            // Test if onSuccess is a function or a load event
            if (onSuccess && onSuccess.call) a = [onSuccess, onError];

            // Test if request is complete
            if (xhr.readyState == 4) {

                // index will be:
                // 0 if status is between 0 and 399
                // 1 if status is over
                cb = a[0 | xhr.status / 400];

                // Safari doesn't support xhr.responseType = 'json'
                // so the response is parsed
                if (cb) {
                    var response;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        console.log(e);
                    }
                    var result = ((xhr.status === 200 || xhr.status === 0) && xhr.responseText !== "") ? response : xhr;
                    cb(result);
                }
            }
        };

        // Send
        xhr.send();

        // Return request
        return xhr;
    };
    //------------------------------------------------------------------
    // Step 2: After fetching manifest (localStorage or XHR), load it
    function loadManifest(manifest, fromLocalStorage, timeout) {
        // Safety timeout. If BOOTSTRAP_OK is not defined,
        // it will delete the 'localStorage' version and revert to factory settings.
        if (fromLocalStorage) {
            setTimeout(function() {
                if (!window.BOOTSTRAP_OK) {
                    console.warn('BOOTSTRAP_OK !== true; Resetting to original manifest.json...');
                    localStorage.removeItem('manifest');
                    location.reload();
                }
            }, timeout);
        }

        if (!manifest.load) {
            console.error('Manifest has nothing to load (manifest.load is empty).', manifest);
            return;
        }

        manifest.root = manifest.root || './';

        var el,
            loadAsScript = (isFirefox == true && manifest.root == './') || !isFirefox,
            head = document.getElementsByTagName('head')[0],
            scripts = manifest.load.concat(),
            now = Date.now(),
            loading = [],
            count = 0,
            index = 0,
            scriptsContent = "",
            cssContent = "";

        function finishLoadingFromFS() {
            index++;
            if (index == loading.length) {
                var el = document.createElement('style');
                el.type = 'text/css';
                el.innerHTML = cssContent;
                head.appendChild(el);

                var el = document.createElement('script');
                el.type = 'text/javascript';
                console.log("appending script")
                el.innerHTML = scriptsContent;
                head.appendChild(el);
            }
        }

        function loadNextFromFS(index) {
            if ((loading.length - 1) >= index) {
                var element = loading[index][0];
                var source = loading[index][1];
                window.__fs.root.getFile(source, {},
                    function(fileEntry) { //onSuccess
                        fileEntry.file(function(file) {
                            var reader = new FileReader();
                            reader.onloadend = function() {
                                index++;
                                loadNextFromFS(index);
                                if (element.type == "text/javascript") {
                                    scriptsContent = scriptsContent + "\n" + this.result.toString();
                                } else {
                                    cssContent = cssContent + "\n" + this.result.toString();
                                }
                                finishLoadingFromFS();
                            }
                            reader.readAsText(file);
                        });
                    },
                    function() {} //onError
                )
            }
        }

        // Load Scripts
        function loadScripts() {
            scripts.forEach(function(src) {
                if (!src) return;
                // Ensure the 'src' has no '/' (it's in the root already)
                if (src[0] === '/') src = src.substr(1);
                //Don't use the root manifest when loading from local storage for Firefox
                if (loadAsScript) {
                    src = manifest.root + src;
                } else {
                    src = "app/" + src;
                }
                // Load javascript
                if (src.substr(-5).indexOf(".js") > -1) {
                    el = document.createElement('script');
                    el.type = 'text/javascript';
                    el.async = false;
                    el.defer = true;
                    //TODO: Investigate if cache busting is nessecary for some platforms, apparently it does not work in IEMobile 10
                    if (loadAsScript) {
                        el.src = src;
                    } else {
                        loading.push([el, src]);
                    }
                    // Load CSS
                } else {
                    el = document.createElement(loadAsScript ? 'link' : 'style');
                    el.rel = "stylesheet";
                    if (loadAsScript) {
                        el.href = src;
                    } else {
                        loading.push([el, src]);
                    }
                    el.type = "text/css";
                }
                head.appendChild(el);
            });
            if (!loadAsScript) {
                loadNextFromFS(count);
            }
        }

        //---------------------------------------------------
        // Step 3: Ensure the 'root' end with a '/'
        if (manifest.root.length > 0 && manifest.root[manifest.root.length - 1] !== '/')
            manifest.root += '/';

        // Step 4: Save manifest for next time
        if (!fromLocalStorage)
            localStorage.setItem('manifest', JSON.stringify(manifest));

        // Step 5: Load Scripts
        // If we're loading Cordova files, make sure Cordova is ready first!
        if (typeof window.cordova !== 'undefined') {
            document.addEventListener("deviceready", loadScripts, false);
        } else {
            if (loadAsScript) {
                loadScripts();
            } else {
                window.requestFileSystem(1, 20 * 1024 * 1024, function(fs) {
                    window.__fs = fs;
                    loadScripts();
                }, function() {});
            }
        }
        // Save to global scope
        window.Manifest = manifest;
    }
    //---------------------------------------------------------------------
    window.Manifest = {};
    // Step 1: Load manifest from localStorage
    var manifest = JSON.parse(localStorage.getItem('manifest'));
    // grab manifest.json location from <script manifest="..."></script>
    var s = document.querySelector('script[manifest]');
    // Not in localStorage? Fetch it!
    // Modified the code to always fetch the manifest if loaded locally, this allows auto updates to remain off and still be able to use the new manifests
    if (!manifest || manifest && manifest.root && manifest.root == "./") {
        var noQueryString = location.href.indexOf("?") > -1 ? location.href.split("?")[0] : location.href;
        var url = noQueryString.replace(noQueryString.split("/")[noQueryString.split("/").length - 1], '') + ((s ? s.getAttribute('manifest') : null) || 'bootstrap.json') + '?now=' + (new Date()).getTime();
        // get manifest.json, then loadManifest.
        pegasus(url).then(loadManifest, function(xhr) {
            console.error('Could not download ' + url + ': ' + xhr.status);
        });
        // Manifest was in localStorage. Load it immediatly.
    } else {
        loadManifest(manifest, true, s.getAttribute('timeout') || 10000);
    }
})();