# Manual Ansible Deployment Guide

If the automated `deploy.ps1` script fails, follow these manual steps:

## Step 1: Verify Instance is Ready

Wait 2-3 minutes after creating the instance for it to fully initialize.

```powershell
# Test SSH connection
ssh -i newsrec.pem ec2-user@3.109.199.44 "echo 'Ready'"
```

If this fails with "Permission denied (publickey)", the instance may still be initializing. Wait another minute and try again.

## Step 2: Verify Ansible Installation

```powershell
ansible --version
```

If you get an error about `os.get_blocking`, upgrade Ansible:

```powershell
pip install --upgrade ansible
```

## Step 3: Verify Inventory Configuration

Check `ansible/inventory.ini`:

```ini
[aws_ec2]
news-recommender-server ansible_host=3.109.199.44 ansible_user=ec2-user ansible_ssh_private_key_file=./newsrec.pem ansible_python_interpreter=/usr/bin/python3

[aws_ec2:vars]
ansible_port=22
ansible_connection=ssh
```

## Step 4: Test Ansible Connectivity

```powershell
cd ansible
ansible all -i inventory.ini -m ping
```

Expected output:
```
news-recommender-server | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

## Step 5: Run Deployment Playbook

```powershell
ansible-playbook deploy.yml -i inventory.ini -e "newsapi_api_key=d4c96b43d3c04883a2790bd6c78d0117" -e "github_repo=https://github.com/YOUR_USERNAME/News-Recommender-Enhanced-API.git" -v
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 6: Verify Deployment

```powershell
# Check API health
curl http://3.109.199.44/api/health

# Open API docs
start http://3.109.199.44/docs

# SSH and check logs
ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo tail -f /var/log/news-recommender-api.log"
```

## Troubleshooting

### SSH Permission Denied

**Issue:** `Permission denied (publickey)`

**Solutions:**
1. Wait 2-3 minutes for instance to initialize
2. Verify PEM file permissions:
   ```powershell
   icacls newsrec.pem /inheritance:r /grant:r "nithi:F"
   ```
3. Verify correct PEM key was downloaded from AWS
4. Check security group allows port 22 from your IP

### Ansible Error: `os.get_blocking`

**Issue:** `AttributeError: module 'os' has no attribute 'get_blocking'`

**Solution:** Upgrade Ansible
```powershell
pip install --upgrade ansible
```

### Playbook Fails

**Issue:** Playbook execution fails

**Solutions:**
1. Check instance logs:
   ```powershell
   ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo tail -100 /var/log/news-recommender-api.log"
   ```

2. Check Supervisor status:
   ```powershell
   ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo supervisorctl status"
   ```

3. Check Nginx status:
   ```powershell
   ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo systemctl status nginx"
   ```

4. Re-run playbook with more verbosity:
   ```powershell
   ansible-playbook deploy.yml -i inventory.ini -e "newsapi_api_key=d4c96b43d3c04883a2790bd6c78d0117" -vvv
   ```

### API Not Responding

**Issue:** `curl http://3.109.199.44/api/health` times out

**Solutions:**
1. Wait 1-2 minutes for services to start
2. Check if services are running:
   ```powershell
   ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo supervisorctl status all"
   ```

3. Check Nginx:
   ```powershell
   ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo systemctl status nginx"
   ```

4. Check application logs:
   ```powershell
   ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo tail -50 /var/log/news-recommender-api.log"
   ```

## Quick Commands Reference

```powershell
# SSH into instance
ssh -i newsrec.pem ec2-user@3.109.199.44

# View application logs
ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo tail -f /var/log/news-recommender-api.log"

# Restart application
ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo supervisorctl restart news-recommender-api"

# Check service status
ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo supervisorctl status"

# Check Nginx status
ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo systemctl status nginx"

# View Nginx error logs
ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo tail -f /var/log/nginx/error.log"

# Reload Nginx
ssh -i newsrec.pem ec2-user@3.109.199.44 "sudo systemctl reload nginx"
```

## Next Steps

Once deployment is successful:

1. **Test API endpoints:**
   ```
   http://3.109.199.44/api/health
   http://3.109.199.44/docs
   http://3.109.199.44/api/trending
   ```

2. **Configure SSL/TLS** (optional but recommended)

3. **Set up monitoring** and alerting

4. **Configure backups** for data persistence

5. **Document your deployment** for future reference
