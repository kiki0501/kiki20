package controller

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetGitHubSyncStatus 获取 GitHub 同步状态
func GetGitHubSyncStatus(c *gin.Context) {
	// 从数据库读取配置
	common.OptionMapRWMutex.RLock()
	token := common.OptionMap["GitHubSyncToken"]
	repo := common.OptionMap["GitHubSyncRepo"]
	lastSyncTime := common.OptionMap["GitHubSyncLastTime"]
	common.OptionMapRWMutex.RUnlock()
	
	enabled := token != "" && repo != ""
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":        enabled,
			"last_sync_time": lastSyncTime,
		},
	})
}

// TriggerGitHubSync 手动触发 GitHub 同步
func TriggerGitHubSync(c *gin.Context) {
	// 从数据库读取配置
	common.OptionMapRWMutex.RLock()
	token := common.OptionMap["GitHubSyncToken"]
	repo := common.OptionMap["GitHubSyncRepo"]
	common.OptionMapRWMutex.RUnlock()
	
	if token == "" || repo == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "GitHub 同步未配置，请先配置 GitHub Token 和仓库地址",
		})
		return
	}
	
	// 执行同步
	err := syncDataToGitHub(token, repo)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "同步失败: " + err.Error(),
		})
		return
	}
	
	// 更新最后同步时间
	now := time.Now().Format("2006-01-02 15:04:05")
	_ = model.UpdateOption("GitHubSyncLastTime", now)
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "同步成功",
	})
}

// syncDataToGitHub 同步数据到 GitHub
func syncDataToGitHub(token, repoURL string) error {
	// 解析仓库信息
	// 支持格式: https://github.com/owner/repo 或 owner/repo
	repoURL = strings.TrimPrefix(repoURL, "https://github.com/")
	repoURL = strings.TrimPrefix(repoURL, "http://github.com/")
	repoURL = strings.Trim(repoURL, "/")
	
	parts := strings.Split(repoURL, "/")
	if len(parts) != 2 {
		return fmt.Errorf("无效的仓库地址格式，应为: owner/repo")
	}
	owner, repo := parts[0], parts[1]
	
	// 1. 同步 Token 数据
	if err := syncTokens(token, owner, repo); err != nil {
		return fmt.Errorf("同步 Token 失败: %v", err)
	}
	
	// 2. 同步 Channel 数据
	if err := syncChannels(token, owner, repo); err != nil {
		return fmt.Errorf("同步 Channel 失败: %v", err)
	}
	
	// 3. 同步 Model 数据
	if err := syncModels(token, owner, repo); err != nil {
		return fmt.Errorf("同步 Model 失败: %v", err)
	}
	
	return nil
}

// syncTokens 同步令牌数据到 GitHub
func syncTokens(token, owner, repo string) error {
	// 获取所有令牌（不包括 key）
	var tokens []model.Token
	if err := model.DB.Omit("key").Find(&tokens).Error; err != nil {
		return err
	}
	
	// 序列化为 JSON
	data, err := json.MarshalIndent(tokens, "", "  ")
	if err != nil {
		return err
	}
	
	// 上传到 GitHub
	return uploadToGitHub(token, owner, repo, "tokens.json", data)
}

// syncChannels 同步渠道数据到 GitHub
func syncChannels(token, owner, repo string) error {
	// 获取所有渠道（不包括 key）
	var channels []model.Channel
	if err := model.DB.Omit("key").Find(&channels).Error; err != nil {
		return err
	}
	
	// 序列化为 JSON
	data, err := json.MarshalIndent(channels, "", "  ")
	if err != nil {
		return err
	}
	
	// 上传到 GitHub
	return uploadToGitHub(token, owner, repo, "channels.json", data)
}

// syncModels 同步模型数据到 GitHub
func syncModels(token, owner, repo string) error {
	// 获取所有模型
	var models []model.Model
	if err := model.DB.Find(&models).Error; err != nil {
		return err
	}
	
	// 序列化为 JSON
	data, err := json.MarshalIndent(models, "", "  ")
	if err != nil {
		return err
	}
	
	// 上传到 GitHub
	return uploadToGitHub(token, owner, repo, "models.json", data)
}

// uploadToGitHub 上传文件到 GitHub 仓库
func uploadToGitHub(token, owner, repo, path string, content []byte) error {
	// GitHub API URL
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path)
	
	// 先获取文件的 SHA（如果文件存在）
	var sha string
	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err == nil && resp.StatusCode == 200 {
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()
		if s, ok := result["sha"].(string); ok {
			sha = s
		}
	}
	
	// 准备上传数据
	payload := map[string]interface{}{
		"message": fmt.Sprintf("Update %s - %s", path, time.Now().Format("2006-01-02 15:04:05")),
		"content": common.Base64Encode(string(content)),
	}
	if sha != "" {
		payload["sha"] = sha
	}
	
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	
	// 上传文件
	req, err = http.NewRequest("PUT", apiURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")
	
	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("GitHub API 错误 (%d): %v", resp.StatusCode, errResp)
	}
	
	return nil
}