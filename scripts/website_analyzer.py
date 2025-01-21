#!/usr/bin/env python3
import argparse
import dns.resolver
import requests
import json
import socket
import whois
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor
from colorama import init, Fore, Style

init()  # Initialize colorama for cross-platform colored output

class WebsiteAnalyzer:
    def __init__(self, url):
        self.url = url if url.startswith(('http://', 'https://')) else f'https://{url}'
        self.domain = urlparse(self.url).netloc
        self.results = {
            'headers': {},
            'dns': {},
            'technologies': [],
            'security': {},
            'performance': {},
            'frameworks': set(),
            'server_info': {}
        }

    def analyze_headers(self):
        """Analyze HTTP response headers"""
        try:
            response = requests.get(self.url, timeout=10)
            headers = response.headers
            
            # Store interesting headers
            interesting_headers = [
                'Server', 'X-Powered-By', 'X-AspNet-Version', 'X-Runtime',
                'X-Generator', 'X-Framework', 'Via'
            ]
            
            print(f"\n{Fore.CYAN}[+] Header Analysis:{Style.RESET_ALL}")
            for header in interesting_headers:
                if header in headers:
                    print(f"  {Fore.GREEN}✓{Style.RESET_ALL} {header}: {headers[header]}")
                    self.results['headers'][header] = headers[header]
            
            # Analyze security headers
            security_headers = {
                'Strict-Transport-Security': 'HSTS',
                'Content-Security-Policy': 'CSP',
                'X-Frame-Options': 'Clickjacking Protection',
                'X-XSS-Protection': 'XSS Protection',
                'X-Content-Type-Options': 'MIME Sniffing Protection'
            }
            
            print(f"\n{Fore.CYAN}[+] Security Headers:{Style.RESET_ALL}")
            for header, description in security_headers.items():
                if header in headers:
                    print(f"  {Fore.GREEN}✓{Style.RESET_ALL} {description} enabled")
                    self.results['security'][header] = headers[header]
                else:
                    print(f"  {Fore.RED}✗{Style.RESET_ALL} {description} not found")
                    
            return response
        except Exception as e:
            print(f"{Fore.RED}Error analyzing headers: {e}{Style.RESET_ALL}")
            return None

    def analyze_dns(self):
        """Analyze DNS records"""
        print(f"\n{Fore.CYAN}[+] DNS Analysis:{Style.RESET_ALL}")
        try:
            # A Record
            a_records = dns.resolver.resolve(self.domain, 'A')
            self.results['dns']['A'] = [str(r) for r in a_records]
            print(f"  {Fore.GREEN}✓{Style.RESET_ALL} A Records: {', '.join(self.results['dns']['A'])}")

            # MX Record
            try:
                mx_records = dns.resolver.resolve(self.domain, 'MX')
                self.results['dns']['MX'] = [str(r.exchange) for r in mx_records]
                print(f"  {Fore.GREEN}✓{Style.RESET_ALL} MX Records: {', '.join(self.results['dns']['MX'])}")
            except:
                print(f"  {Fore.YELLOW}!{Style.RESET_ALL} No MX records found")

            # NS Record
            ns_records = dns.resolver.resolve(self.domain, 'NS')
            self.results['dns']['NS'] = [str(r) for r in ns_records]
            print(f"  {Fore.GREEN}✓{Style.RESET_ALL} NS Records: {', '.join(self.results['dns']['NS'])}")

            # Check for CDN
            cdn_providers = {
                'cloudflare': 'Cloudflare',
                'akamai': 'Akamai',
                'cloudfront': 'AWS CloudFront',
                'fastly': 'Fastly',
                'cdn77': 'CDN77'
            }
            
            for record in self.results['dns']['NS']:
                for cdn, name in cdn_providers.items():
                    if cdn in record.lower():
                        print(f"  {Fore.GREEN}✓{Style.RESET_ALL} CDN detected: {name}")
                        self.results['dns']['CDN'] = name

        except Exception as e:
            print(f"{Fore.RED}Error analyzing DNS: {e}{Style.RESET_ALL}")

    def analyze_source(self, response):
        """Analyze webpage source code"""
        if not response:
            return
            
        print(f"\n{Fore.CYAN}[+] Source Code Analysis:{Style.RESET_ALL}")
        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Check meta tags
            meta_generators = soup.find_all('meta', attrs={'name': 'generator'})
            if meta_generators:
                for meta in meta_generators:
                    content = meta.get('content', '')
                    print(f"  {Fore.GREEN}✓{Style.RESET_ALL} Generator: {content}")
                    self.results['technologies'].append(content)

            # Check for common frameworks and libraries
            frameworks = {
                'react': ['react', 'react-dom'],
                'vue': ['vue.js', 'vuejs'],
                'angular': ['ng-', 'angular'],
                'jquery': ['jquery'],
                'bootstrap': ['bootstrap'],
                'tailwind': ['tailwind'],
                'wordpress': ['wp-content', 'wp-includes'],
                'laravel': ['laravel'],
                'django': ['csrftoken', 'django'],
                'rails': ['rails']
            }
            
            # Check scripts
            scripts = soup.find_all('script')
            for script in scripts:
                src = script.get('src', '')
                for fw, patterns in frameworks.items():
                    if any(p in src.lower() or p in str(script.string or '').lower() for p in patterns):
                        self.results['frameworks'].add(fw)
                        print(f"  {Fore.GREEN}✓{Style.RESET_ALL} Detected {fw.title()}")

            # Convert set to list for JSON serialization
            self.results['frameworks'] = list(self.results['frameworks'])

        except Exception as e:
            print(f"{Fore.RED}Error analyzing source: {e}{Style.RESET_ALL}")

    def analyze_performance(self, response):
        """Analyze website performance metrics"""
        if not response:
            return
            
        print(f"\n{Fore.CYAN}[+] Performance Analysis:{Style.RESET_ALL}")
        try:
            # Response time
            response_time = response.elapsed.total_seconds()
            self.results['performance']['response_time'] = response_time
            print(f"  {Fore.GREEN}✓{Style.RESET_ALL} Response Time: {response_time:.2f} seconds")

            # Content size
            content_size = len(response.content) / 1024  # Size in KB
            self.results['performance']['content_size'] = content_size
            print(f"  {Fore.GREEN}✓{Style.RESET_ALL} Content Size: {content_size:.2f} KB")

            # Check for compression
            if 'Content-Encoding' in response.headers:
                compression = response.headers['Content-Encoding']
                self.results['performance']['compression'] = compression
                print(f"  {Fore.GREEN}✓{Style.RESET_ALL} Compression: {compression}")

        except Exception as e:
            print(f"{Fore.RED}Error analyzing performance: {e}{Style.RESET_ALL}")

    def save_results(self):
        """Save analysis results to a JSON file"""
        filename = f"{self.domain}_analysis.json"
        try:
            with open(filename, 'w') as f:
                json.dump(self.results, f, indent=2)
            print(f"\n{Fore.GREEN}Results saved to {filename}{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}Error saving results: {e}{Style.RESET_ALL}")

    def run_analysis(self):
        """Run all analysis tasks"""
        print(f"\n{Fore.YELLOW}Analyzing {self.url}...{Style.RESET_ALL}")
        
        response = self.analyze_headers()
        
        # Run DNS and source analysis in parallel
        with ThreadPoolExecutor(max_workers=3) as executor:
            dns_future = executor.submit(self.analyze_dns)
            source_future = executor.submit(self.analyze_source, response)
            perf_future = executor.submit(self.analyze_performance, response)
            
            dns_future.result()
            source_future.result()
            perf_future.result()
        
        self.save_results()

def main():
    parser = argparse.ArgumentParser(description='Analyze website technology stack')
    parser.add_argument('url', help='URL of the website to analyze')
    args = parser.parse_args()

    analyzer = WebsiteAnalyzer(args.url)
    analyzer.run_analysis()

if __name__ == '__main__':
    main() 