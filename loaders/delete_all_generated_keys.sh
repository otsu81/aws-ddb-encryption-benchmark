#!/bin/bash

find cloud_private_keys/ -name "*" -print0 | xargs -0 rm
find cloud_public_keys/ -name "*" -print0 | xargs -0 rm
find hub_private_keys/ -name "*" -print0 | xargs -0 rm
find hub_public_keys/ -name "*" -print0 | xargs -0 rm