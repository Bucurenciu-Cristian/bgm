meta:
  id: chrome_session
  title: Chromium Session File
  file-extension: snss
  endian: le

seq:
  - id: magic
    contents: SNSS
  - id: version
    type: u4
  - id: commands
    type: command
    repeat: eos

types:
  command:
    seq:
      - id: size
        type: u2
      - id: id
        type: u1
        enum: command_type
      - id: body
        size: size - 1
        type:
          switch-on: id
          cases:
            'command_type::set_tab_window': set_tab_window
            'command_type::set_tab_index_in_window': set_tab_index_in_window
            'command_type::set_tab_group': set_tab_group
            'command_type::set_tab_group_metadata2': set_tab_group_metadata
            'command_type::update_tab_navigation': update_tab_navigation
            'command_type::set_selected_navigation_index': set_selected_navigation_index
            'command_type::set_selected_tab_in_index': set_selected_tab_in_index
            'command_type::set_window_type': set_window_type
            'command_type::set_pinned_state': set_pinned_state
            'command_type::set_window_bounds3': set_window_bounds3
            'command_type::tab_closed': tab_closed
            'command_type::window_closed': window_closed
            'command_type::set_active_window': set_active_window

  # Basic types
  session_id:
    seq:
      - id: value
        type: u4

  cr_string16:
    doc: Chrome's string16 format (length-prefixed UTF-16LE)
    seq:
      - id: length
        type: u4
      - id: data
        size: length * 2
        type: str
        encoding: UTF-16LE

  # Command bodies
  set_tab_window:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: window_id
        type: session_id

  set_tab_index_in_window:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: index
        type: u4

  set_tab_group:
    doc: Associates a tab with a tab group
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: token_high
        type: u8
      - id: token_low
        type: u8

  set_tab_group_metadata:
    doc: Tab group metadata (title, color)
    seq:
      - id: pickle_size
        type: u4
      - id: token_high
        type: u8
      - id: token_low
        type: u8
      - id: title
        type: cr_string16
      - id: color
        type: u4
        enum: tab_group_color

  update_tab_navigation:
    doc: Tab URL and title from navigation entry
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: navigation_index
        type: u4
      - id: url
        type: cr_string16
      - id: title
        type: cr_string16
      # Additional fields exist but we only need URL and title

  set_selected_navigation_index:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: index
        type: u4

  set_selected_tab_in_index:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id
      - id: index
        type: u4

  set_window_type:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id
      - id: window_type
        type: u4

  set_pinned_state:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: is_pinned
        type: u1

  set_window_bounds3:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id
      - id: x
        type: s4
      - id: y
        type: s4
      - id: width
        type: s4
      - id: height
        type: s4
      - id: show_state
        type: u4

  tab_closed:
    seq:
      - id: pickle_size
        type: u4
      - id: tab_id
        type: session_id
      - id: close_time
        type: u8

  window_closed:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id
      - id: close_time
        type: u8

  set_active_window:
    seq:
      - id: pickle_size
        type: u4
      - id: window_id
        type: session_id

enums:
  command_type:
    0: set_tab_window
    2: set_tab_index_in_window
    6: update_tab_navigation
    7: set_selected_navigation_index
    8: set_selected_tab_in_index
    9: set_window_type
    12: set_pinned_state
    14: set_window_bounds3
    16: tab_closed
    17: window_closed
    20: set_active_window
    25: set_tab_group
    26: set_tab_group_metadata
    27: set_tab_group_metadata2

  tab_group_color:
    0: grey
    1: blue
    2: red
    3: yellow
    4: green
    5: pink
    6: purple
    7: cyan
    8: orange
