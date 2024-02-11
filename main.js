(function () {
  let plugin = { id: "acode.cli.plugin" };
  let url = acode.require("url");
  let openFolder = acode.require("openfolder");
  let EditorFile = acode.require("editorfile");

  let installPlugin = () => {};

  function unFormatUrl(fileUrl) {
    if (!(fileUrl.startsWith("file:///") || fileUrl.startsWith("/"))) {
      return fileUrl;
    }

    // Remove the "file:///" and "/" prefix
    let path = fileUrl.replace(/^file:\/\//, "").slice(1);
    path = path.replace("storage/emulated/0", "sdcard");

    if (
      path.startsWith("$HOME") ||
      path.startsWith("data/data/com.termux/files/home")
    ) {
      let termuxPrefix =
        "content://com.termux.documents/tree/%2Fdata%2Fdata%2Fcom.termux%2Ffiles%2Fhome::/data/data/com.termux/files/home";

      // Remove $HOME or termux default home path and merge the rest
      let termuxPath = path.startsWith("$HOME")
        ? path.substr("$HOME".length)
        : path.substr("data/data/com.termux/files/home".length);
      return termuxPrefix + termuxPath;
    } else if (path.startsWith("sdcard")) {
      let sdcardPrefix =
        "content://com.android.externalstorage.documents/tree/primary%3A";
      let relPath = path.substr("sdcard/".length);

      let sourcesList = JSON.parse(localStorage.storageList || "[]");
      for (let source of sourcesList) {
        if (source.uri.startsWith(sdcardPrefix)) {
          let raw = decodeURIComponent(source.uri.substr(sdcardPrefix.length));
          if (relPath.startsWith(raw)) {
            return source.uri + "::primary:" + relPath;
          }
        }
      }

      // Extract the folder name after sdcard
      let folderName = relPath.split("/")[0];
      // Add the folder name and merge the rest
      let sdcardPath =
        sdcardPrefix +
        folderName +
        "::primary:" +
        path.substr("sdcard/".length);
      return sdcardPath;
    } else {
      return fileUrl;
    }
  }
  
  console.log("Hello World")

  acode.setPluginInit(plugin.id, () => {
    let intent = acode.require("intent");

    intent.addHandler(({ module, action, value }) => {
      if (module == "cli") {
        let path;
        if (value) {
          path = unFormatUrl(decodeURIComponent(value));
        }
        let basename = url.basename(path);

        switch (action) {
          case "open-file":
            if (basename) {
              new EditorFile(basename, {
                uri: path
              });
            }
            break;
          case "open-folder":
            openFolder(path, { name: basename });
            break;
          case "install":
          case "enable":
          case "disable":
          case "uninstall":
            let acodeSdk = acode.require("acode.sdk");
            if (acodeSdk) {
              if (action === "install") {
                acodeSdk.installPlugin({ url: path, type: "file" });
              } else if (action === "uninstall") {
                acodeSdk.uninstall(value, { plugin: { name: value } });
              } else if (action === "enable") {
                acodeSdk.enable(value, { plugin: { name: value } });
              } else if (action === "disable") {
                acodeSdk.disable(value, { plugin: { name: value } });
              }
            } else {
              acode.alert(
                "Acode CLI",
                "Acode SDK plugin is required to install plugin."
              );
            }
            break;
        }
      }
    });
  });
})();
