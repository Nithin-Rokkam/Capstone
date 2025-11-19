#!/bin/bash

# News Recommender API - Ansible Deployment Script
# This script automates the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PEM_FILE="${SCRIPT_DIR}/newsrec.pem"
INVENTORY_FILE="${SCRIPT_DIR}/inventory.ini"
PLAYBOOK_FILE="${SCRIPT_DIR}/deploy.yml"

# Functions
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Ansible
    if ! command -v ansible &> /dev/null; then
        print_error "Ansible is not installed"
        echo "Install with: pip install ansible"
        exit 1
    fi
    print_success "Ansible installed"
    
    # Check PEM file
    if [ ! -f "$PEM_FILE" ]; then
        print_error "PEM file not found: $PEM_FILE"
        echo "Please copy your newsrec.pem to the ansible directory"
        exit 1
    fi
    print_success "PEM file found"
    
    # Check PEM permissions
    if [ $(stat -f%A "$PEM_FILE" 2>/dev/null || stat -c%a "$PEM_FILE") != "600" ]; then
        print_warning "PEM file permissions not 600, fixing..."
        chmod 600 "$PEM_FILE"
        print_success "PEM file permissions fixed"
    fi
    
    # Check inventory file
    if [ ! -f "$INVENTORY_FILE" ]; then
        print_error "Inventory file not found: $INVENTORY_FILE"
        exit 1
    fi
    print_success "Inventory file found"
    
    # Check playbook file
    if [ ! -f "$PLAYBOOK_FILE" ]; then
        print_error "Playbook file not found: $PLAYBOOK_FILE"
        exit 1
    fi
    print_success "Playbook file found"
}

# Get EC2 IP from inventory
get_ec2_ip() {
    grep "ansible_host=" "$INVENTORY_FILE" | head -1 | sed 's/.*ansible_host=\([^ ]*\).*/\1/'
}

# Test SSH connection
test_ssh_connection() {
    print_header "Testing SSH Connection"
    
    EC2_IP=$(get_ec2_ip)
    
    if [ -z "$EC2_IP" ] || [ "$EC2_IP" = "YOUR_EC2_IP" ]; then
        print_error "EC2 IP not configured in inventory.ini"
        echo "Please update: ansible_host=YOUR_EC2_IP"
        exit 1
    fi
    
    echo "Testing connection to: $EC2_IP"
    
    if ssh -i "$PEM_FILE" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ec2-user@"$EC2_IP" "echo 'SSH connection successful'" &> /dev/null; then
        print_success "SSH connection successful"
    else
        print_error "SSH connection failed"
        echo "Troubleshooting:"
        echo "1. Verify EC2 IP: $EC2_IP"
        echo "2. Check security group allows port 22"
        echo "3. Verify PEM file is correct"
        exit 1
    fi
}

# Test Ansible connectivity
test_ansible_connectivity() {
    print_header "Testing Ansible Connectivity"
    
    if ansible all -i "$INVENTORY_FILE" -m ping &> /dev/null; then
        print_success "Ansible connectivity successful"
    else
        print_error "Ansible connectivity failed"
        exit 1
    fi
}

# Get deployment variables
get_deployment_variables() {
    print_header "Deployment Configuration"
    
    read -p "Enter NewsAPI Key (or press Enter to use default): " NEWSAPI_KEY
    if [ -z "$NEWSAPI_KEY" ]; then
        NEWSAPI_KEY="d4c96b43d3c04883a2790bd6c78d0117"
    fi
    
    read -p "Enter GitHub repository URL (or press Enter to skip): " GITHUB_REPO
    if [ -z "$GITHUB_REPO" ]; then
        GITHUB_REPO="https://github.com/YOUR_USERNAME/News-Recommender-Enhanced-API.git"
    fi
    
    echo ""
    echo "Configuration Summary:"
    echo "  EC2 IP: $(get_ec2_ip)"
    echo "  NewsAPI Key: ${NEWSAPI_KEY:0:10}..."
    echo "  GitHub Repo: $GITHUB_REPO"
    echo ""
    
    read -p "Continue with deployment? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
}

# Run Ansible playbook
run_playbook() {
    print_header "Running Ansible Playbook"
    
    cd "$SCRIPT_DIR"
    
    ansible-playbook "$PLAYBOOK_FILE" \
        -i "$INVENTORY_FILE" \
        -e "newsapi_api_key=$NEWSAPI_KEY" \
        -e "github_repo=$GITHUB_REPO" \
        -v
    
    if [ $? -eq 0 ]; then
        print_success "Playbook executed successfully"
    else
        print_error "Playbook execution failed"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"
    
    EC2_IP=$(get_ec2_ip)
    
    echo "Waiting for API to be ready..."
    sleep 10
    
    for i in {1..10}; do
        if curl -s "http://$EC2_IP/api/health" &> /dev/null; then
            print_success "API is healthy"
            echo ""
            echo "Deployment Information:"
            echo "  API URL: http://$EC2_IP"
            echo "  API Docs: http://$EC2_IP/docs"
            echo "  Health Check: http://$EC2_IP/api/health"
            return 0
        fi
        echo "Attempt $i/10: Waiting for API..."
        sleep 5
    done
    
    print_warning "Could not verify API health, but deployment may still be successful"
    echo "Check logs with: ssh -i $PEM_FILE ec2-user@$EC2_IP sudo tail -f /var/log/news-recommender-api.log"
}

# Main execution
main() {
    print_header "News Recommender API - Ansible Deployment"
    
    check_prerequisites
    test_ssh_connection
    test_ansible_connectivity
    get_deployment_variables
    run_playbook
    verify_deployment
    
    print_header "Deployment Complete!"
    echo -e "${GREEN}Your News Recommender API is now deployed on AWS EC2${NC}"
}

# Run main function
main
