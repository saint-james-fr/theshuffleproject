// Terminal-based cluster visualization and summary
import fs from 'fs';
import { readFileSync } from 'fs';
import readline from 'readline';

type ClusterData = {
  summary: {
    totalVideos: number;
    clustersFound: number;
    clusteredVideos: number;
    timestamp: string;
  };
  clusters: Array<{
    clusterId: number;
    videos: Array<{
      title: string;
      url: string;
      videoId: string;
      channel: string;
    }>;
    reason: string;
    confidence: number;
  }>;
};

class ClusterSummaryVisualizer {
  private data: ClusterData;

  constructor(jsonPath: string) {
    try {
      const jsonContent = readFileSync(jsonPath, 'utf-8');
      this.data = JSON.parse(jsonContent);
    } catch (error) {
      console.error('❌ Error loading clustering data:', error);
      process.exit(1);
    }
  }

  // Colors for terminal output
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgRed: '\x1b[41m',
  };

  private formatTitle(title: string): string {
    return `${this.colors.bright}${this.colors.cyan}${title}${this.colors.reset}`;
  }

  private formatNumber(num: number): string {
    return `${this.colors.bright}${this.colors.yellow}${num}${this.colors.reset}`;
  }

  private formatConfidence(confidence: number): string {
    const percentage = (confidence * 100).toFixed(1);
    let color = this.colors.red;
    
    if (confidence >= 0.8) color = this.colors.green;
    else if (confidence >= 0.6) color = this.colors.yellow;
    
    return `${color}${percentage}%${this.colors.reset}`;
  }

  private formatReason(reason: string): string {
    let color = this.colors.magenta;
    
    if (reason.includes('Boiler Room')) color = this.colors.red;
    else if (reason.includes('remix') || reason.includes('versions')) color = this.colors.blue;
    else if (reason.includes('Live') || reason.includes('DJ sets')) color = this.colors.green;
    else if (reason.includes('Chez Damier')) color = this.colors.yellow;
    
    return `${color}${reason}${this.colors.reset}`;
  }

  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    let color = this.colors.bgRed;
    if (percentage >= 80) color = this.colors.bgGreen;
    else if (percentage >= 60) color = this.colors.bgYellow;
    
    return `${color}${'█'.repeat(filled)}${this.colors.reset}${'░'.repeat(empty)}`;
  }

  showSummary(): void {
    console.log('\n' + '='.repeat(70));
    console.log(this.formatTitle('🎵 RON TRENT VIDEO CLUSTERING ANALYSIS'));
    console.log('='.repeat(70));
    
    const { summary } = this.data;
    const clusteredVideos = this.data.clusters.reduce((sum, cluster) => sum + cluster.videos.length, 0);
    const avgClusterSize = (clusteredVideos / this.data.clusters.length).toFixed(1);
    const avgConfidence = (this.data.clusters.reduce((sum, cluster) => sum + cluster.confidence, 0) / this.data.clusters.length * 100).toFixed(1);
    
    console.log(`📊 Total Videos:      ${this.formatNumber(summary.totalVideos)}`);
    console.log(`🔍 Clusters Found:    ${this.formatNumber(summary.clustersFound)}`);
    console.log(`📹 Videos Clustered:  ${this.formatNumber(clusteredVideos)} (${((clusteredVideos / summary.totalVideos) * 100).toFixed(1)}%)`);
    console.log(`📈 Avg Cluster Size:  ${this.formatNumber(avgClusterSize)} videos`);
    console.log(`🎯 Avg Confidence:    ${this.formatConfidence(parseFloat(avgConfidence) / 100)}`);
    console.log(`⏰ Generated:         ${new Date(summary.timestamp).toLocaleString()}`);
  }

  showTopClusters(limit: number = 10): void {
    console.log('\n' + this.formatTitle(`🏆 TOP ${limit} CLUSTERS BY CONFIDENCE`));
    console.log('-'.repeat(70));
    
    const sortedClusters = [...this.data.clusters]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
    
    sortedClusters.forEach((cluster, index) => {
      const confidencePercentage = cluster.confidence * 100;
      console.log(`\n${index + 1}.${' '.repeat(2)}${this.formatTitle(`Cluster #${cluster.clusterId}`)}`);
      console.log(`    📊 Confidence: ${this.formatConfidence(cluster.confidence)} ${this.createProgressBar(confidencePercentage)}`);
      console.log(`    📝 Reason:     ${this.formatReason(cluster.reason)}`);
      console.log(`    📹 Videos:     ${this.formatNumber(cluster.videos.length)}`);
      
      // Show first 3 video titles as examples
      const exampleTitles = cluster.videos.slice(0, 3);
      console.log(`    📄 Examples:`);
      exampleTitles.forEach(video => {
        const truncatedTitle = video.title.length > 60 ? video.title.substring(0, 57) + '...' : video.title;
        console.log(`       • ${this.colors.dim}${truncatedTitle}${this.colors.reset}`);
      });
      
      if (cluster.videos.length > 3) {
        console.log(`       ${this.colors.dim}... and ${cluster.videos.length - 3} more${this.colors.reset}`);
      }
    });
  }

  showReasonBreakdown(): void {
    console.log('\n' + this.formatTitle('📊 CLUSTER BREAKDOWN BY REASON'));
    console.log('-'.repeat(70));
    
    const reasonCounts = this.data.clusters.reduce((acc, cluster) => {
      acc[cluster.reason] = (acc[cluster.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedReasons = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a);
    
    sortedReasons.forEach(([reason, count]) => {
      const percentage = ((count / this.data.clusters.length) * 100).toFixed(1);
      console.log(`${this.formatReason(reason.padEnd(30))} ${this.formatNumber(count)} clusters (${percentage}%)`);
    });
  }

  showLargeClusters(minSize: number = 10): void {
    const largeClusters = this.data.clusters
      .filter(cluster => cluster.videos.length >= minSize)
      .sort((a, b) => b.videos.length - a.videos.length);
    
    if (largeClusters.length === 0) {
      console.log(`\n${this.colors.dim}No clusters found with ${minSize}+ videos${this.colors.reset}`);
      return;
    }
    
    console.log('\n' + this.formatTitle(`🔍 LARGE CLUSTERS (${minSize}+ videos)`));
    console.log('-'.repeat(70));
    
    largeClusters.forEach(cluster => {
      console.log(`\n${this.formatTitle(`Cluster #${cluster.clusterId}`)} - ${this.formatNumber(cluster.videos.length)} videos`);
      console.log(`Confidence: ${this.formatConfidence(cluster.confidence)} | Reason: ${this.formatReason(cluster.reason)}`);
      
      // Group by channel to show distribution
      const channelCounts = cluster.videos.reduce((acc, video) => {
        const channel = video.channel || 'Unknown';
        acc[channel] = (acc[channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topChannels = Object.entries(channelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      
      console.log(`Top channels: ${topChannels.map(([channel, count]) => 
        `${this.colors.cyan}${channel}${this.colors.reset} (${count})`
      ).join(', ')}`);
    });
  }

  interactive(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const showMenu = () => {
      console.log('\n' + this.formatTitle('🎵 INTERACTIVE CLUSTER EXPLORER'));
      console.log('-'.repeat(50));
      console.log('1. Show summary');
      console.log('2. Show top clusters');
      console.log('3. Show reason breakdown');
      console.log('4. Show large clusters');
      console.log('5. Search clusters');
      console.log('6. Export filtered results');
      console.log('0. Exit');
      console.log('-'.repeat(50));
    };

    const handleChoice = (choice: string) => {
      switch (choice.trim()) {
        case '1':
          this.showSummary();
          break;
        case '2':
          console.log('\nHow many top clusters to show? (default: 10)');
          rl.question('> ', (answer) => {
            const limit = parseInt(answer) || 10;
            this.showTopClusters(limit);
            setTimeout(() => rl.prompt(), 100);
          });
          return;
        case '3':
          this.showReasonBreakdown();
          break;
        case '4':
          console.log('\nMinimum cluster size? (default: 10)');
          rl.question('> ', (answer) => {
            const minSize = parseInt(answer) || 10;
            this.showLargeClusters(minSize);
            setTimeout(() => rl.prompt(), 100);
          });
          return;
        case '5':
          console.log('\nEnter search term:');
          rl.question('> ', (searchTerm) => {
            this.searchClusters(searchTerm);
            setTimeout(() => rl.prompt(), 100);
          });
          return;
        case '6':
          this.exportFilteredResults();
          break;
        case '0':
          console.log('\n👋 Goodbye!');
          rl.close();
          return;
        default:
          console.log('❌ Invalid choice. Please try again.');
      }
      setTimeout(() => rl.prompt(), 100);
    };

    showMenu();
    rl.prompt();
    
    rl.on('line', handleChoice);
  }

  searchClusters(searchTerm: string): void {
    const results = this.data.clusters.filter(cluster =>
      cluster.videos.some(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.channel && video.channel.toLowerCase().includes(searchTerm.toLowerCase()))
      ) || cluster.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    console.log(`\n🔍 Found ${this.formatNumber(results.length)} clusters matching "${searchTerm}"`);
    
    if (results.length === 0) {
      console.log(`${this.colors.dim}No matches found.${this.colors.reset}`);
      return;
    }

    results.forEach(cluster => {
      console.log(`\n${this.formatTitle(`Cluster #${cluster.clusterId}`)}`);
      console.log(`${this.formatConfidence(cluster.confidence)} | ${this.formatReason(cluster.reason)} | ${this.formatNumber(cluster.videos.length)} videos`);
      
      const matchingVideos = cluster.videos.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.channel && video.channel.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      matchingVideos.slice(0, 3).forEach(video => {
        console.log(`  • ${this.colors.dim}${video.title}${this.colors.reset}`);
      });
    });
  }

  exportFilteredResults(): void {
    // This could be expanded to export specific filtered results
    console.log('\n📄 Full results are available in advanced-clusters.json');
    console.log('🌐 For interactive visualization, open cluster-visualizer.html in a browser');
  }
}

// Main execution
const visualizer = new ClusterSummaryVisualizer('advanced-clusters.json');

// Check command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'summary':
    visualizer.showSummary();
    break;
  case 'top':
    const limit = parseInt(args[1]) || 10;
    visualizer.showSummary();
    visualizer.showTopClusters(limit);
    break;
  case 'breakdown':
    visualizer.showSummary();
    visualizer.showReasonBreakdown();
    break;
  case 'large':
    const minSize = parseInt(args[1]) || 10;
    visualizer.showSummary();
    visualizer.showLargeClusters(minSize);
    break;
  case 'search':
    if (!args[1]) {
      console.log('❌ Please provide a search term: npm run cluster-summary search "boiler room"');
      process.exit(1);
    }
    visualizer.showSummary();
    visualizer.searchClusters(args[1]);
    break;
  case 'interactive':
  case 'i':
    visualizer.interactive();
    break;
  default:
    console.log('\n🎵 Ron Trent Video Clustering - Terminal Visualizer');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/cluster-summary.ts summary              # Show summary stats');
    console.log('  npx tsx scripts/cluster-summary.ts top [limit]          # Show top clusters');
    console.log('  npx tsx scripts/cluster-summary.ts breakdown            # Show reason breakdown');
    console.log('  npx tsx scripts/cluster-summary.ts large [minSize]      # Show large clusters');
    console.log('  npx tsx scripts/cluster-summary.ts search "term"        # Search clusters');
    console.log('  npx tsx scripts/cluster-summary.ts interactive          # Interactive mode');
    console.log('\nFor web visualization, open scripts/cluster-visualizer.html in a browser');
    
    // Show summary by default
    visualizer.showSummary();
}
