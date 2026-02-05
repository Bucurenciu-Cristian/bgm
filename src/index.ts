#!/usr/bin/env bun
import { Command } from "commander";

const program = new Command();

program
  .name("bgm")
  .description("Brave Groups Manager - manage tab groups and bookmarks")
  .version("0.1.0");

program.parse();
