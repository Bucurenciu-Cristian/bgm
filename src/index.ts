#!/usr/bin/env bun
import { Command } from "commander";
import { profilesCommand } from "./cli/profiles";
import { bookmarksCommand } from "./cli/bookmarks";
import { groupsCommand } from "./cli/groups";
import { parkCommand, unparkCommand } from "./cli/park";

const program = new Command();

program
  .name("bgm")
  .description("Brave Groups Manager - manage tab groups and bookmarks")
  .version("0.1.0");

program.addCommand(profilesCommand);
program.addCommand(bookmarksCommand);
program.addCommand(groupsCommand);
program.addCommand(parkCommand);
program.addCommand(unparkCommand);

program.parse();
