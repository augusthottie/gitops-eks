terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
    }
  }
}

# =============================================================================
# ECR Repository
# =============================================================================

resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# =============================================================================
# Modules
# =============================================================================

module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  cluster_name       = var.cluster_name
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "eks" {
  source = "./modules/eks"

  cluster_name       = var.cluster_name
  cluster_version    = var.cluster_version
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  node_instance_type = var.node_instance_type
  node_desired       = var.node_desired
  node_min           = var.node_min
  node_max           = var.node_max
}
