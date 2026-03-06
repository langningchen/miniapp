#!/bin/bash

# Copyright (C) 2025 Langning Chen
# 
# This file is part of miniapp.
# 
# miniapp is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# miniapp is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

# Script configuration
set -e  # Exit immediately if a command exits with a non-zero status

# Global variables
VERBOSE=false

# Info log output
function log_info() {
    echo "[INFO] $*"
}

# Error log output  
function log_error() {
    echo "[ERROR] $*" >&2
}

# Verbose log output
function log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo "[VERBOSE] $*" >&2
    fi
}

# Create necessary directories
function create_directories() {
    log_info "Creating necessary directories..."
    
    if ! mkdir -p libs; then
        log_error "Failed to create libs directory"
        return 1
    fi
    
    if ! mkdir -p dist; then
        log_error "Failed to create dist directory"  
        return 1
    fi
    
    log_verbose "Directories created successfully"
}

# Find and setup toolchain
function setup_toolchain() {
    log_info "Setting up toolchain..."
    
    # Use the first available toolchain
    local toolchain=$(find jsapi/toolchains -mindepth 1 -maxdepth 1 -type d | head -n 1)
    
    if [ -z "$toolchain" ]; then
        log_error "No toolchain found in jsapi/toolchains/"
        return 1
    fi
    
    log_info "Using toolchain: $toolchain"
    
    export CROSS_TOOLCHAIN_PREFIX=$(find $(pwd)/$toolchain/bin -name "*buildroot*gcc" | head -n 1 | sed 's/gcc$//')
    
    if [ -z "$CROSS_TOOLCHAIN_PREFIX" ]; then
        log_error "No suitable gcc compiler found in toolchain"
        return 1
    fi
    
    log_info "Using cross compiler prefix: $CROSS_TOOLCHAIN_PREFIX"
    log_verbose "Toolchain setup completed successfully"
}

# Build native library
function build_native() {
    log_info "Building native library..."
    
    log_verbose "Running cmake configuration..."
    if ! cmake -S jsapi -B jsapi/build; then
        log_error "CMake configuration failed"
        return 1
    fi
    
    log_verbose "Running make build..."
    if ! make -C jsapi/build -j $(nproc); then
        log_error "Make build failed"
        return 1
    fi
    
    log_verbose "Copying shared library..."
    if ! cp jsapi/build/libjsapi_langningchen.so libs/; then
        log_error "Failed to copy libjsapi_langningchen.so to libs/"
        return 1
    fi
    
    log_info "Native library build completed successfully"
}

# Package UI
function package_ui() {
    log_info "Packaging UI..."
    
    if ! pnpm exec aiot-cli build; then
        log_error "UI packaging failed"
        return 1
    fi
    
    log_verbose "UI packaging completed successfully"
}

# Create final distribution
function create_distribution() {
    log_info "Creating final distribution..."
    
    local amr_file=$(find . -name "800*.amr")
    if [ -z "$amr_file" ]; then
        log_error "No AMR file found matching pattern '800*.amr' in directory"
        return 1
    fi
    
    local target_name="miniapp-$(basename $CROSS_TOOLCHAIN_PREFIX | sed 's/-$//').amr"
    
    log_verbose "Copying $amr_file to dist/$target_name"
    if ! cp "$amr_file" "dist/$target_name"; then
        log_error "Failed to copy AMR file to distribution directory"
        return 1
    fi
    
    log_info "Distribution created successfully: dist/$target_name"
}

# Main function
function main() {
    log_info "Starting miniapp build process..."
    
    # Execute build steps
    if ! create_directories; then
        log_error "Directory creation failed"
        exit 1
    fi
    
    if ! setup_toolchain; then
        log_error "Toolchain setup failed"
        exit 1
    fi
    
    if ! build_native; then
        log_error "Native library build failed"
        exit 1
    fi
    
    if ! package_ui; then
        log_error "UI packaging failed"
        exit 1
    fi
    
    if ! create_distribution; then
        log_error "Distribution creation failed"
        exit 1
    fi
    
    log_info "Build process completed successfully!"
}

# Run main function with all arguments
main "$@"
