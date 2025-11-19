# News Recommender API - Ansible Deployment Script (PowerShell)
# This script automates the deployment process for Windows users

param(
    [string]$EC2IP = "",
    [string]$NewsAPIKey = "d4c96b43d3c04883a2790bd6c78d0117",
    [string]$GitHubRepo = "https://github.com/YOUR_USERNAME/News-Recommender-Enhanced-API.git",
    [switch]$SkipSSHTest = $false
)

# Colors
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

function Write-Header {
    param([string]$Message)
    Write-Host "========================================" -ForegroundColor $SuccessColor
    Write-Host $Message -ForegroundColor $SuccessColor
    Write-Host "========================================" -ForegroundColor $SuccessColor
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $SuccessColor
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ ERROR: $Message" -ForegroundColor $ErrorColor
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ WARNING: $Message" -ForegroundColor $WarningColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor $InfoColor
}

# Check prerequisites
function Check-Prerequisites {
    Write-Header "Checking Prerequisites"
    
    # Check Ansible
    try {
        $output = & ansible --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Ansible installed"
        } else {
            throw "Ansible check failed"
        }
    }
    catch {
        Write-Error-Custom "Ansible is not installed or has compatibility issues"
        Write-Info "Install with: pip install ansible"
        Write-Info "If you have Python 3.13+, you may need: pip install --upgrade ansible"
        exit 1
    }
    
    # Check PEM file
    $PemFile = "newsrec.pem"
    if (-not (Test-Path $PemFile)) {
        Write-Error-Custom "PEM file not found: $PemFile"
        Write-Info "Please copy your newsrec.pem to the ansible directory"
        exit 1
    }
    Write-Success "PEM file found"
    
    # Check inventory file
    $InventoryFile = "inventory.ini"
    if (-not (Test-Path $InventoryFile)) {
        Write-Error-Custom "Inventory file not found: $InventoryFile"
        exit 1
    }
    Write-Success "Inventory file found"
    
    # Check playbook file
    $PlaybookFile = "deploy.yml"
    if (-not (Test-Path $PlaybookFile)) {
        Write-Error-Custom "Playbook file not found: $PlaybookFile"
        exit 1
    }
    Write-Success "Playbook file found"
}

# Get EC2 IP from inventory
function Get-EC2IP {
    $InventoryFile = "inventory.ini"
    $Content = Get-Content $InventoryFile
    $Match = $Content | Select-String "ansible_host=([^ ]*)"
    if ($Match) {
        return $Match.Matches[0].Groups[1].Value
    }
    return ""
}

# Test SSH connection
function Test-SSHConnection {
    if ($SkipSSHTest) {
        Write-Warning-Custom "Skipping SSH test"
        return
    }
    
    Write-Header "Testing SSH Connection"
    
    if ([string]::IsNullOrEmpty($EC2IP)) {
        $EC2IP = Get-EC2IP
    }
    
    if ([string]::IsNullOrEmpty($EC2IP) -or $EC2IP -eq "YOUR_EC2_IP") {
        Write-Error-Custom "EC2 IP not configured in inventory.ini"
        Write-Info "Please update: ansible_host=YOUR_EC2_IP"
        exit 1
    }
    
    Write-Info "Testing connection to: $EC2IP"
    
    try {
        & ssh -i newsrec.pem -o ConnectTimeout=5 -o StrictHostKeyChecking=no ec2-user@$EC2IP "echo 'SSH connection successful'" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "SSH connection successful"
        } else {
            throw "SSH connection failed"
        }
    }
    catch {
        Write-Error-Custom "SSH connection failed"
        Write-Info "Troubleshooting:"
        Write-Info "1. Verify EC2 IP: $EC2IP"
        Write-Info "2. Check security group allows port 22"
        Write-Info "3. Verify PEM file is correct"
        Write-Info "4. Wait a few minutes for new instance to be ready"
        exit 1
    }
}

# Test Ansible connectivity
function Test-AnsibleConnectivity {
    Write-Header "Testing Ansible Connectivity"
    
    try {
        Write-Info "Running Ansible ping test..."
        & ansible all -i inventory.ini -m ping 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Ansible connectivity successful"
        } else {
            throw "Ansible ping failed"
        }
    }
    catch {
        Write-Error-Custom "Ansible connectivity failed"
        Write-Info "This may be normal if the instance is still starting up"
        Write-Info "Continuing with deployment..."
    }
}

# Get deployment variables
function Get-DeploymentVariables {
    Write-Header "Deployment Configuration"
    
    if ([string]::IsNullOrEmpty($EC2IP)) {
        $EC2IP = Get-EC2IP
    }
    
    Write-Info "EC2 IP: $EC2IP"
    Write-Info "NewsAPI Key: $($NewsAPIKey.Substring(0, 10))..."
    Write-Info "GitHub Repo: $GitHubRepo"
    
    $Confirm = Read-Host "Continue with deployment? (y/n)"
    if ($Confirm -ne "y" -and $Confirm -ne "Y") {
        Write-Warning-Custom "Deployment cancelled"
        exit 0
    }
}

# Run Ansible playbook
function Run-Playbook {
    Write-Header "Running Ansible Playbook"
    
    $Command = "ansible-playbook deploy.yml -i inventory.ini -e `"newsapi_api_key=$NewsAPIKey`" -e `"github_repo=$GitHubRepo`" -v"
    
    Invoke-Expression $Command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Playbook executed successfully"
    }
    else {
        Write-Error-Custom "Playbook execution failed"
        exit 1
    }
}

# Verify deployment
function Verify-Deployment {
    Write-Header "Verifying Deployment"
    
    if ([string]::IsNullOrEmpty($EC2IP)) {
        $EC2IP = Get-EC2IP
    }
    
    Write-Info "Waiting for API to be ready..."
    Start-Sleep -Seconds 10
    
    for ($i = 1; $i -le 10; $i++) {
        try {
            $Response = Invoke-WebRequest -Uri "http://$EC2IP/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($Response.StatusCode -eq 200) {
                Write-Success "API is healthy"
                Write-Host ""
                Write-Host "Deployment Information:" -ForegroundColor $SuccessColor
                Write-Host "  API URL: http://$EC2IP" -ForegroundColor $SuccessColor
                Write-Host "  API Docs: http://$EC2IP/docs" -ForegroundColor $SuccessColor
                Write-Host "  Health Check: http://$EC2IP/api/health" -ForegroundColor $SuccessColor
                return
            }
        }
        catch {
            # Continue to next attempt
        }
        
        Write-Info "Attempt $i/10: Waiting for API..."
        Start-Sleep -Seconds 5
    }
    
    Write-Warning-Custom "Could not verify API health, but deployment may still be successful"
    Write-Info "Check logs with: ssh -i newsrec.pem ec2-user@$EC2IP sudo tail -f /var/log/news-recommender-api.log"
}

# Main execution
function Main {
    Write-Header "News Recommender API - Ansible Deployment"
    
    Check-Prerequisites
    Test-SSHConnection
    Test-AnsibleConnectivity
    Get-DeploymentVariables
    Run-Playbook
    Verify-Deployment
    
    Write-Header "Deployment Complete!"
    Write-Host "Your News Recommender API is now deployed on AWS EC2" -ForegroundColor $SuccessColor
}

# Run main function
Main
