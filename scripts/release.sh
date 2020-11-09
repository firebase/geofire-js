#!/bin/bash

set -o nounset
set -o errexit

print_usage() {
  echo "$0 <version>"
  echo
  echo "Arguments:"
  echo "  version: version to release"
  exit 1
}

exit_on_error() {
  echo $1
  exit 1
}

if [[ $# -gt 0 ]]; then
  next_version="$1"
else
  print_usage
fi

which jq &> /dev/null || exit_on_error "Missing jq command. https://stedolan.github.io/jq/"
which hub &> /dev/null || exit_on_error "Missing hub command. https://github.com/github/hub#installation"

current_version=$(jq -r '.version' packages/geofire/package.json)
echo "Current version: ${current_version}"
echo "Next version: ${next_version}"
echo

echo "Does that look correct?"
echo "  <enter> to continue"
read

echo
echo "Building and testing"
npm install
npm run bootstrap
npm run build
npm run test

# Modify the geofire-common version
tmp=$(jq ".version=\"${next_version}\"" packages/geofire-common/package.json)
echo "${tmp}" > packages/geofire-common/package.json

# Modify the geofire version
tmp=$(jq ".version=\"${next_version}\"" packages/geofire/package.json)
echo "${tmp}" > packages/geofire/package.json

# Modify the geofire geofire-common dependency version
tmp=$(jq ".dependencies[\"geofire-common\"]=\"${next_version}\"" packages/geofire/package.json)
echo "${tmp}" > packages/geofire/package.json

# Commit the version changes
git commit -am "[release] Version ${next_version}"

# Create git tag
next_version_tag="v${next_version}"
git tag "${next_version_tag}"

echo
echo "Logging into npm via wombat-dressing-room (see http://go/npm-publish)."
echo "   Press <enter> to open browser, then click 'Create 24 hour token'."
echo "   If you can't open a browser, try logging in from a different machine:"
echo "     npm login --registry https://wombat-dressing-room.appspot.com"
echo "   And then copy/paste the resulting ~/.npmrc contents here:"
echo "   (this will overwrite your current ~/.npmrc)"
read npmrc

if [[ ! $npmrc == "" ]]; then
  echo $npmrc > ~/.npmrc
else
  npm login --registry https://wombat-dressing-room.appspot.com
fi

# Publish
echo
echo "Publishing geofire-common@${next_version} to npm."
(
  cd packages/geofire-common
  npm publish --registry https://wombat-dressing-room.appspot.com
)

echo
echo "Publishing geofire@${next_version} to npm."
(
  cd packages/geofire
  npm publish --registry https://wombat-dressing-room.appspot.com
)

# Create a separate release notes file to be included in the github release.
release_notes_file=$(mktemp)
echo "${next_version}" >> "${release_notes_file}"
echo >> "${release_notes_file}"
cat CHANGELOG.md >> "${release_notes_file}"
echo ${release_notes_file}

echo
echo "Clearing CHANGELOG.md."
echo > CHANGELOG.md
git commit -m "[release] Cleared CHANGELOG.md after ${next_version} release." CHANGELOG.md

echo
echo "Pushing changes to GitHub."
git push origin master --tags

echo
echo "Creating GitHub release."
hub release create \
    -F "${release_notes_file}" \
    -a packages/geofire-common/dist/geofire-common/geofire-common.min.js \
    -a packages/geofire/dist/geofire/geofire.min.js \
    "${next_version_tag}"
