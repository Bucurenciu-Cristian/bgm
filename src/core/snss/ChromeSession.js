// This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'kaitai-struct/KaitaiStream'], factory);
  } else if (typeof exports === 'object' && exports !== null && typeof exports.nodeType !== 'number') {
    factory(exports, require('kaitai-struct/KaitaiStream'));
  } else {
    factory(root.ChromeSession || (root.ChromeSession = {}), root.KaitaiStream);
  }
})(typeof self !== 'undefined' ? self : this, function (ChromeSession_, KaitaiStream) {
var ChromeSession = (function() {
  ChromeSession.CommandType = Object.freeze({
    SET_TAB_WINDOW: 0,
    SET_TAB_INDEX_IN_WINDOW: 2,
    UPDATE_TAB_NAVIGATION: 6,
    SET_SELECTED_NAVIGATION_INDEX: 7,
    SET_SELECTED_TAB_IN_INDEX: 8,
    SET_WINDOW_TYPE: 9,
    SET_PINNED_STATE: 12,
    SET_WINDOW_BOUNDS3: 14,
    TAB_CLOSED: 16,
    WINDOW_CLOSED: 17,
    SET_ACTIVE_WINDOW: 20,
    SET_TAB_GROUP: 25,
    SET_TAB_GROUP_METADATA: 26,
    SET_TAB_GROUP_METADATA2: 27,

    0: "SET_TAB_WINDOW",
    2: "SET_TAB_INDEX_IN_WINDOW",
    6: "UPDATE_TAB_NAVIGATION",
    7: "SET_SELECTED_NAVIGATION_INDEX",
    8: "SET_SELECTED_TAB_IN_INDEX",
    9: "SET_WINDOW_TYPE",
    12: "SET_PINNED_STATE",
    14: "SET_WINDOW_BOUNDS3",
    16: "TAB_CLOSED",
    17: "WINDOW_CLOSED",
    20: "SET_ACTIVE_WINDOW",
    25: "SET_TAB_GROUP",
    26: "SET_TAB_GROUP_METADATA",
    27: "SET_TAB_GROUP_METADATA2",
  });

  ChromeSession.TabGroupColor = Object.freeze({
    GREY: 0,
    BLUE: 1,
    RED: 2,
    YELLOW: 3,
    GREEN: 4,
    PINK: 5,
    PURPLE: 6,
    CYAN: 7,
    ORANGE: 8,

    0: "GREY",
    1: "BLUE",
    2: "RED",
    3: "YELLOW",
    4: "GREEN",
    5: "PINK",
    6: "PURPLE",
    7: "CYAN",
    8: "ORANGE",
  });

  function ChromeSession(_io, _parent, _root) {
    this._io = _io;
    this._parent = _parent;
    this._root = _root || this;

    this._read();
  }
  ChromeSession.prototype._read = function() {
    this.magic = this._io.readBytes(4);
    if (!((KaitaiStream.byteArrayCompare(this.magic, new Uint8Array([83, 78, 83, 83])) == 0))) {
      throw new KaitaiStream.ValidationNotEqualError(new Uint8Array([83, 78, 83, 83]), this.magic, this._io, "/seq/0");
    }
    this.version = this._io.readU4le();
    this.commands = [];
    var i = 0;
    while (!this._io.isEof()) {
      this.commands.push(new Command(this._io, this, this._root));
      i++;
    }
  }

  var Command = ChromeSession.Command = (function() {
    function Command(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    Command.prototype._read = function() {
      this.size = this._io.readU2le();
      this.id = this._io.readU1();
      switch (this.id) {
      case ChromeSession.CommandType.SET_ACTIVE_WINDOW:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetActiveWindow(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_PINNED_STATE:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetPinnedState(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_SELECTED_NAVIGATION_INDEX:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetSelectedNavigationIndex(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_SELECTED_TAB_IN_INDEX:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetSelectedTabInIndex(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_TAB_GROUP:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetTabGroup(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_TAB_GROUP_METADATA2:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetTabGroupMetadata(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_TAB_INDEX_IN_WINDOW:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetTabIndexInWindow(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_TAB_WINDOW:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetTabWindow(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_WINDOW_BOUNDS3:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetWindowBounds3(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.SET_WINDOW_TYPE:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new SetWindowType(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.TAB_CLOSED:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new TabClosed(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.UPDATE_TAB_NAVIGATION:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new UpdateTabNavigation(_io__raw_body, this, this._root);
        break;
      case ChromeSession.CommandType.WINDOW_CLOSED:
        this._raw_body = this._io.readBytes(this.size - 1);
        var _io__raw_body = new KaitaiStream(this._raw_body);
        this.body = new WindowClosed(_io__raw_body, this, this._root);
        break;
      default:
        this.body = this._io.readBytes(this.size - 1);
        break;
      }
    }

    return Command;
  })();

  /**
   * Chrome's string16 format (length-prefixed UTF-16LE)
   */

  var CrString16 = ChromeSession.CrString16 = (function() {
    function CrString16(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    CrString16.prototype._read = function() {
      this.length = this._io.readU4le();
      this.data = KaitaiStream.bytesToStr(this._io.readBytes(this.length * 2), "UTF-16LE");
    }

    return CrString16;
  })();

  var SessionId = ChromeSession.SessionId = (function() {
    function SessionId(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SessionId.prototype._read = function() {
      this.value = this._io.readU4le();
    }

    return SessionId;
  })();

  var SetActiveWindow = ChromeSession.SetActiveWindow = (function() {
    function SetActiveWindow(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetActiveWindow.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.windowId = new SessionId(this._io, this, this._root);
    }

    return SetActiveWindow;
  })();

  var SetPinnedState = ChromeSession.SetPinnedState = (function() {
    function SetPinnedState(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetPinnedState.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.tabId = new SessionId(this._io, this, this._root);
      this.isPinned = this._io.readU1();
    }

    return SetPinnedState;
  })();

  var SetSelectedNavigationIndex = ChromeSession.SetSelectedNavigationIndex = (function() {
    function SetSelectedNavigationIndex(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetSelectedNavigationIndex.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.tabId = new SessionId(this._io, this, this._root);
      this.index = this._io.readU4le();
    }

    return SetSelectedNavigationIndex;
  })();

  var SetSelectedTabInIndex = ChromeSession.SetSelectedTabInIndex = (function() {
    function SetSelectedTabInIndex(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetSelectedTabInIndex.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.windowId = new SessionId(this._io, this, this._root);
      this.index = this._io.readU4le();
    }

    return SetSelectedTabInIndex;
  })();

  /**
   * Associates a tab with a tab group
   */

  var SetTabGroup = ChromeSession.SetTabGroup = (function() {
    function SetTabGroup(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetTabGroup.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.tabId = new SessionId(this._io, this, this._root);
      this.tokenHigh = this._io.readU8le();
      this.tokenLow = this._io.readU8le();
    }

    return SetTabGroup;
  })();

  /**
   * Tab group metadata (title, color)
   */

  var SetTabGroupMetadata = ChromeSession.SetTabGroupMetadata = (function() {
    function SetTabGroupMetadata(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetTabGroupMetadata.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.tokenHigh = this._io.readU8le();
      this.tokenLow = this._io.readU8le();
      this.title = new CrString16(this._io, this, this._root);
      this.color = this._io.readU4le();
    }

    return SetTabGroupMetadata;
  })();

  var SetTabIndexInWindow = ChromeSession.SetTabIndexInWindow = (function() {
    function SetTabIndexInWindow(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetTabIndexInWindow.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.tabId = new SessionId(this._io, this, this._root);
      this.index = this._io.readU4le();
    }

    return SetTabIndexInWindow;
  })();

  var SetTabWindow = ChromeSession.SetTabWindow = (function() {
    function SetTabWindow(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetTabWindow.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.tabId = new SessionId(this._io, this, this._root);
      this.windowId = new SessionId(this._io, this, this._root);
    }

    return SetTabWindow;
  })();

  var SetWindowBounds3 = ChromeSession.SetWindowBounds3 = (function() {
    function SetWindowBounds3(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetWindowBounds3.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.windowId = new SessionId(this._io, this, this._root);
      this.x = this._io.readS4le();
      this.y = this._io.readS4le();
      this.width = this._io.readS4le();
      this.height = this._io.readS4le();
      this.showState = this._io.readU4le();
    }

    return SetWindowBounds3;
  })();

  var SetWindowType = ChromeSession.SetWindowType = (function() {
    function SetWindowType(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    SetWindowType.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.windowId = new SessionId(this._io, this, this._root);
      this.windowType = this._io.readU4le();
    }

    return SetWindowType;
  })();

  var TabClosed = ChromeSession.TabClosed = (function() {
    function TabClosed(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    TabClosed.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.tabId = new SessionId(this._io, this, this._root);
      this.closeTime = this._io.readU8le();
    }

    return TabClosed;
  })();

  /**
   * Tab URL and title from navigation entry
   */

  var UpdateTabNavigation = ChromeSession.UpdateTabNavigation = (function() {
    function UpdateTabNavigation(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    UpdateTabNavigation.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.tabId = new SessionId(this._io, this, this._root);
      this.navigationIndex = this._io.readU4le();
      this.url = new CrString16(this._io, this, this._root);
      this.title = new CrString16(this._io, this, this._root);
    }

    return UpdateTabNavigation;
  })();

  var WindowClosed = ChromeSession.WindowClosed = (function() {
    function WindowClosed(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root;

      this._read();
    }
    WindowClosed.prototype._read = function() {
      this.pickleSize = this._io.readU4le();
      this.windowId = new SessionId(this._io, this, this._root);
      this.closeTime = this._io.readU8le();
    }

    return WindowClosed;
  })();

  return ChromeSession;
})();
ChromeSession_.ChromeSession = ChromeSession;
});
