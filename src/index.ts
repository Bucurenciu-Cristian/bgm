#!/usr/bin/env bun
import { Command } from "commander";
import { profilesCommand } from "./cli/profiles";

const program = new Command();

program
  .name("bgm")
  .description("Brave Groups Manager - manage tab groups and bookmarks")
  .version("0.1.0");

program.addCommand(profilesCommand);

program.parse();
