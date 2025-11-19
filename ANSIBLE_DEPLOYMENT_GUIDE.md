# Ansible Deployment Guide for AWS EC2

This guide walks you through deploying the News Recommender API to AWS EC2 using Ansible.

## Prerequisites

### 1. AWS EC2 Setup
- **Instance Type**: t3.medium or larger (recommended for ML models)
- **OS**: Amazon Linux 2 or Ubuntu 20.04+
- **Storage**: At least 50GB (for MIND dataset)
- **Security Group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **Key Pair**: Download your `.pem` file (e.g., `newsrec.pem`)

### 2. Local Machine Setup

#### Install Ansible
```bash
# Windows (using WSL or Git Bash)
pip install ansible

# macOS
brew install ansible

# Linux
sudo apt-get install ansible
# or
sudo yum install ansible
```

#### Install AWS CLI (optional, for managing instances)
```bash
pip install awscli
```

## Deployment Steps

### Step 1: Prepare Ansible Configuration

1. **Copy your PEM key to the ansible directory**
   ```bash
   cp /path/to/newsrec.pem ansible/newsrec.pem
   chmod 600 ansible/newsrec.pem
   ```

2. **Update inventory.ini with your EC2 instance**
   ```ini
   [aws_ec2]
   news-recommender-server ansible_host=YOUR_EC2_IP ansible_user=ec2-user
   ```
   
   Replace `YOUR_EC2_IP` with your actual EC2 instance public IP.

3. **Verify SSH connection**
   ```bash
   ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
   ```

### Step 2: Prepare Deployment Variables

Create a file `ansible/vars.yml` with your configuration:

```yaml
---
newsapi_api_key: "d4c96b43d3c04883a2790bd6c78d0117"
github_repo: "https://github.com/YOUR_USERNAME/News-Recommender-Enhanced-API.git"
```

### Step 3: Run Ansible Playbook

#### Option A: Basic Deployment
```bash
cd ansible
ansible-playbook deploy.yml -i inventory.ini
```

#### Option B: With Variables File
```bash
cd ansible
ansible-playbook deploy.yml -i inventory.ini -e @vars.yml
```

#### Option C: With Inline Variables
```bash
cd ansible
ansible-playbook deploy.yml -i inventory.ini \
  -e "newsapi_api_key=YOUR_API_KEY" \
  -e "github_repo=https://github.com/YOUR_USERNAME/News-Recommender-Enhanced-API.git"
```

### Step 4: Verify Deployment

1. **Check API Health**
   ```bash
   curl http://YOUR_EC2_IP/api/health
   ```

2. **Access API Documentation**
   ```
   http://YOUR_EC2_IP/docs
   ```

3. **Check Application Logs**
   ```bash
   ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
   sudo tail -f /var/log/news-recommender-api.log
   ```

4. **Check Nginx Status**
   ```bash
   ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
   sudo systemctl status nginx
   ```

## Playbook Components

### What the Playbook Does

1. **System Updates**
   - Updates all system packages
   - Installs required dependencies (Python, Git, Nginx, Supervisor)

2. **Application Setup**
   - Creates dedicated application user (`newsrec`)
   - Clones repository from GitHub
   - Creates Python virtual environment
   - Installs Python dependencies

3. **Data Preparation**
   - Creates data directory
   - Downloads MIND dataset (optional, can be skipped)

4. **Service Configuration**
   - Configures Supervisor to manage FastAPI application
   - Configures Nginx as reverse proxy
   - Sets up logging

5. **Service Startup**
   - Starts Supervisor and Nginx
   - Performs health checks

## Configuration Files

### inventory.ini
- Defines EC2 hosts and connection parameters
- Specifies SSH key and user

### deploy.yml
- Main Ansible playbook
- Contains all deployment tasks
- Uses Jinja2 templates for configuration

### Templates (in ansible/templates/)
- `env.j2`: Environment variables
- `supervisor_fastapi.conf.j2`: Supervisor configuration
- `nginx.conf.j2`: Nginx reverse proxy configuration

## Troubleshooting

### SSH Connection Issues
```bash
# Test SSH connection
ssh -i ansible/newsrec.pem -v ec2-user@YOUR_EC2_IP

# Common issues:
# 1. Wrong key permissions: chmod 600 newsrec.pem
# 2. Wrong user: Use 'ec2-user' for Amazon Linux, 'ubuntu' for Ubuntu
# 3. Security group: Ensure port 22 is open
```

### Ansible Connection Issues
```bash
# Test Ansible connectivity
ansible all -i inventory.ini -m ping

# If it fails, check:
# 1. Inventory file syntax
# 2. SSH key path
# 3. EC2 instance IP address
```

### Application Issues
```bash
# SSH into instance
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP

# Check application logs
sudo tail -f /var/log/news-recommender-api.log

# Check supervisor status
sudo supervisorctl status

# Restart application
sudo supervisorctl restart news-recommender-api

# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/news-recommender-error.log
```

### Data Download Issues
If the MIND dataset download fails or times out:
```bash
# SSH into instance
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP

# Manually download data
cd /home/newsrec/news-recommender-api
source venv/bin/activate
python download_data.py

# Restart application
sudo supervisorctl restart news-recommender-api
```

## Post-Deployment

### 1. Set Up SSL/TLS (Optional but Recommended)
```bash
# SSH into instance
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP

# Install Certbot
sudo yum install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

### 2. Set Up Monitoring
```bash
# Check application status
curl http://YOUR_EC2_IP/api/health

# Monitor logs
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
sudo tail -f /var/log/news-recommender-api.log
```

### 3. Configure Auto-Scaling (Optional)
- Use AWS Auto Scaling Groups
- Set up CloudWatch alarms
- Configure load balancing

## Updating Deployment

To update the application after code changes:

```bash
cd ansible
ansible-playbook deploy.yml -i inventory.ini -e "force_update=true"
```

Or manually:
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
cd /home/newsrec/news-recommender-api
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart news-recommender-api
```

## Rollback

If something goes wrong:

```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
cd /home/newsrec/news-recommender-api
git checkout <previous-commit>
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart news-recommender-api
```

## Performance Tuning

### Increase Workers
Edit `/etc/supervisor/conf.d/news-recommender-api.conf`:
```
command=/home/newsrec/news-recommender-api/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 8
```

### Increase Nginx Worker Processes
Edit `/etc/nginx/nginx.conf`:
```
worker_processes auto;
```

## Security Best Practices

1. **Restrict SSH Access**
   - Only allow SSH from specific IPs
   - Use security groups

2. **Use Environment Variables**
   - Store sensitive data in `.env` file
   - Never commit secrets to Git

3. **Enable Firewall**
   ```bash
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

4. **Regular Updates**
   ```bash
   # Run periodically
   ansible-playbook deploy.yml -i inventory.ini
   ```

## Support

For issues or questions:
1. Check the logs: `/var/log/news-recommender-api.log`
2. Verify EC2 security groups
3. Test API endpoints manually
4. Review Ansible output for errors

---

**Deployment successful!** Your News Recommender API is now running on AWS EC2.
